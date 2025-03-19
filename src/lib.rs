pub mod cli; // CLI命令行模块
pub mod targets; // 编译目标模块
pub mod utils; // 公共工具模块

use cli::DisassembleArgs;
use move_bytecode_source_map::utils::source_map_from_file;
use move_command_line_common::files::SOURCE_MAP_EXTENSION;
use std::fs::File;
use std::io::{Read, Write};
use walkdir::WalkDir;

use move_compiler::compiled_unit::CompiledUnit;
use move_compiler::diagnostics::unwrap_or_report_diagnostics;
use move_compiler::shared::{Flags, NumericalAddress};
use move_compiler::Compiler;
use targets::target::TargetType;

use move_binary_format::file_format::CompiledModule;
use move_bytecode_source_map::mapping::SourceMapping;
use move_disassembler::disassembler::{Disassembler, DisassemblerOptions};
use move_ir_types::location::Spanned;

use anyhow::{Error, Result};
use std::collections::BTreeMap;

use std::path::Path;

// 将命名地址转换为数值地址映射
fn convert_named_addresses(address_maps: &[(&str, &str)]) -> BTreeMap<String, NumericalAddress> {
    address_maps
        .iter()
        .map(|(name, addr)| (name.to_string(), NumericalAddress::parse_str(addr).unwrap()))
        .collect()
}

/// 构建Move包
/// 
/// 这是主要的编译入口函数，负责：
/// 1. 收集源文件和依赖
/// 2. 设置编译选项
/// 3. 调用Move编译器
/// 4. 输出编译目标
pub fn build_package(
    package_path: &str,        // 包路径
    dep_dirs: &Vec<&str>,      // 依赖目录
    address_maps: &[(&str, &str)], // 地址映射
    target_types: &Vec<&str>,  // 目标类型
    test_mode: bool,           // 测试模式
    init_function: &str,       // 初始化函数
) -> Result<(), Error> {
    let mut sources: Vec<String> = vec![]; // 源文件路径
    let mut deps: Vec<String> = vec![];    // 依赖路径
    let mut targets: Vec<TargetType> = vec![]; // 编译目标类型

    let path = Path::new(&package_path);
    let sources_dir = path.join("sources");

    // 递归收集源文件
    for entry in WalkDir::new(sources_dir) {
        let entry_raw = entry?;
        if entry_raw.path().is_file() {
            let move_file_path = entry_raw.path().to_str();
            if let Some(f) = move_file_path {
                sources.push(f.to_string());
            }
        }
    }

    // 收集依赖
    for dep_dir in dep_dirs {
        if dep_dir.ends_with(".move") {
            deps.push(dep_dir.to_string());
        }
    }

    // 解析目标类型
    for target_type in target_types {
        let target = TargetType::from((*target_type).to_string());
        targets.push(target);
    }

    // 设置编译选项
    let mut flags = Flags::empty().set_sources_shadow_deps(true);
    if test_mode {
        flags = Flags::testing().set_sources_shadow_deps(true);
    }

    // 转换命名地址映射
    let named_address_map = convert_named_addresses(address_maps);

    // 创建编译器实例
    let c = Compiler::from_files(None, sources, deps, named_address_map).set_flags(flags);

    // 执行编译
    let (source_text, compiled_result) = c.build()?;

    // 处理编译结果
    let compiled_units = unwrap_or_report_diagnostics(&source_text, compiled_result);

    // 提取编译单元
    let units: Vec<CompiledUnit> = compiled_units
        .0
        .into_iter()
        .map(|c| c.into_compiled_unit())
        .collect();

    // 输出编译目标
    let root_path = Path::new(&package_path);
    targets::target::output(&units, &targets, root_path, init_function)
}

/// 反汇编Move字节码
/// 
/// 将Move字节码转换为可读的反汇编代码
pub fn disassemble(args: DisassembleArgs) {
    let path = Path::new(&args.file_path);

    // 打开文件
    let mut file = match File::open(path) {
        Err(e) => panic!("{}", e),
        Ok(f) => f,
    };

    // 读取文件内容
    let mut s = String::new();
    match file.read_to_string(&mut s) {
        Ok(_) => println!("[DEBUG]ok"),
        Err(e) => eprintln!("{}", e),
    }

    // 移除0x前缀
    if s.starts_with("0x") {
        s.replace_range(0..2, "");
    }

    // 解码十六进制为字节码
    let bytecode_bytes = hex::decode(s.as_bytes()).unwrap();

    // 设置反汇编选项
    let mut disassembler_options = DisassemblerOptions::new();
    disassembler_options.print_code = !args.skip_code;
    disassembler_options.only_externally_visible = !args.skip_private;
    disassembler_options.print_basic_blocks = !args.skip_basic_blocks;
    disassembler_options.print_locals = !args.skip_locals;

    // 反序列化字节码模块
    let no_loc = Spanned::unsafe_no_loc(()).loc;
    let module = CompiledModule::deserialize_with_defaults(&bytecode_bytes)
        .expect("Module blob can't be deserialized");

    // 获取源码映射
    let source_map =
        source_map_from_file(&Path::new(&args.file_path).with_extension(SOURCE_MAP_EXTENSION));

    // 创建源码映射
    let mut source_mapping = if let Ok(s) = source_map {
        SourceMapping::new(s, &module)
    } else {
        SourceMapping::new_without_source_map(&module, no_loc)
            .expect("Unable to build dummy source mapping")
    };

    // 添加源码
    source_mapping.with_source_code((args.file_path.to_string(), s));

    // 创建反汇编器
    let disassembler = Disassembler::new(source_mapping, disassembler_options);

    // 执行反汇编
    let result = match disassembler.disassemble() {
        Ok(v) => ("d", v),
        Err(e) => ("e", e.to_string()),
    };

    // 输出反汇编结果
    let mut output = path.parent().unwrap().to_path_buf();

    output.push(format!(
        "{}.{}",
        path.file_name().unwrap().to_str().unwrap(),
        result.0
    ));

    let mut f = File::create(output.as_path()).unwrap();

    if let Err(e) = writeln!(f, "{}", result.1) {
        panic!("{}", e)
    }
}
