mod types;

use move_compiler::compiled_unit::CompiledUnit;

use crate::targets::target::Target;
use crate::utils::bcs_ext;
use anyhow::{Error, Result};
use starcoin_crypto::hash::PlainCryptoHash;
use std::path::Path;
use types::function::FunctionId;
use types::module::Module;
use types::package::Package;
use types::script::ScriptFunction;

// Sui目标实现结构体
#[derive(Default)]
pub struct SuiTarget {}

// 实现Target trait
impl Target for SuiTarget {
    // 输出编译单元到目标格式
    fn output(self, units: &[CompiledUnit], dest_path: &Path, init_function: &str) -> Result<()> {
        let mut modules = vec![];

        // 将每个编译单元转换为Sui模块
        for (_i, mv) in units.iter().enumerate() {
            let code = mv.serialize();
            modules.push(Module::new(code));
        }
        
        // 处理初始化函数
        let mut init_script: Option<ScriptFunction> = None;
        if !init_function.is_empty() {
            // 解析初始化函数ID
            let func = FunctionId::from(init_function);
            init_script = match &func {
                Ok(script) => {
                    let script_function = script.clone();
                    // 创建脚本函数对象
                    Some(ScriptFunction::new(
                        script_function.module,
                        script_function.function,
                        vec![],
                        vec![],
                    ))
                }
                _ => anyhow::bail!("Found script in modules -- this shouldn't happen"),
            };
        }

        // 保存发布包
        save_release_package(dest_path, modules, init_script)?;
        Ok(())
    }
}

// 保存发布包到文件系统
fn save_release_package(
    root_dir: &Path,
    modules: Vec<Module>,
    init_script: Option<ScriptFunction>,
) -> Result<(), Error> {
    // 创建发布目录
    let mut release_dir = root_dir.join("release");
    
    // 创建包对象
    let p = Package::new(modules, init_script)?;
    
    // 将包序列化为二进制格式
    let blob = bcs_ext::to_bytes(&p)?;
    
    // 保存二进制包文件
    let release_path = {
        std::fs::create_dir_all(&release_dir)?;
        release_dir.push(format!("{}.blob", "package"));
        release_dir.to_path_buf()
    };
    std::fs::write(&release_path, blob)?;
    
    // 计算并保存包哈希
    let release_hash_path = {
        release_dir.pop();
        release_dir.push("hash.txt");
        release_dir
    };

    let hash = p.crypto_hash().to_string();
    
    std::fs::write(release_hash_path, &hash)?;
    
    // 输出构建结果
    println!("build done, saved: {}, {}", release_path.display(), hash);

    Ok(())
}
