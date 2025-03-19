use std::env;
use std::panic;

use clap::Parser;

use move_web::cli::{CliOptions, Commands};

// 实现自定义的 panic 处理钩子函数
fn hook_impl(info: &panic::PanicInfo) {
    println!("[DEBUG] info: {}", info);
}

// 解析地址映射字符串，格式为 "name:address"
fn parse_address_map(address_map: &str) -> Result<(&str, &str), String> {
    let mut tokens = address_map.split(':');

    match tokens.next() {
        Some(name) => match tokens.next() {
            Some(address) => Ok((name, address)),
            None => Err("Not found address name in address_map".to_string()),
        },
        None => Err("Not found address in address_map".to_string()),
    }
}

// 主函数，处理命令行参数并执行相应操作
fn main() -> std::io::Result<()> {
    // 设置自定义 panic 处理钩子
    panic::set_hook(Box::new(hook_impl));

    // 获取当前工作目录
    let pwd = env::var("PWD").expect("must has set PWD env");
    println!("[DEBUG]pwd: {:?}", pwd);

    // 解析命令行参数
    let args = CliOptions::parse();

    // 根据命令类型执行不同操作
    match args.commands {
        // 构建命令
        Commands::Build {
            dependency_dirs,
            address_maps,
            targets,
            test,
            init_function,
        } => {
            // 处理依赖目录参数
            let dependency_dirs = match dependency_dirs {
                Some(ref v) => v.split(',').collect(), // 多个依赖目录用逗号分隔
                None => vec![],
            };

            // 处理地址映射参数
            let address_maps = match address_maps {
                Some(ref v) => v
                    .split(',')
                    .map(|x: &str| parse_address_map(x).unwrap())
                    .collect(),
                None => vec![], // None => vec!<&str, &str>[],
            };

            // 处理目标类型参数，默认为 "sui"
            let targets = match targets {
                Some(ref v) => v.split(',').collect(),
                None => vec!["sui"],
            };

            // 处理测试模式参数
            let test_mode = test.unwrap_or(false);

            // 处理初始化函数参数
            let init_function = init_function.unwrap_or("".to_string());

            // 调用构建包函数
            let ret = move_web::build_package(
                &pwd,
                &dependency_dirs,
                &address_maps,
                &targets,
                test_mode,
                init_function.as_str(),
            );
            match ret {
                Ok(()) => {
                    println!("[DEBUG]build package ok");
                }
                Err(e) => {
                    eprintln!("[DEBUG]build package error: {:?}", e);
                }
            }
        }

        // 反汇编命令
        Commands::Disassemble(args) => move_web::disassemble(args),
    }

    Ok(())
}
