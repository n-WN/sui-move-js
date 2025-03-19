# sui 目录

这个目录包含 sui-move-js 的 Sui 区块链目标实现，用于将编译后的 Move 代码转换为 Sui 区块链可用的格式。

## 目录结构

- `mod.rs` - Sui 目标的主要实现，包含 `SuiTarget` 结构体和相关功能
- `types/` - Sui 特定类型的定义，如模块、包、函数等

## 功能概述

### SuiTarget 实现

`mod.rs` 中的 `SuiTarget` 结构体实现了 `Target` trait，将通用的 Move 编译单元转换为 Sui 区块链所需的格式：

```rust
impl Target for SuiTarget {
    fn output(self, units: &[CompiledUnit], dest_path: &Path, init_function: &str) -> Result<()> {
        // 将编译单元转换为 Sui 模块
        // 处理初始化函数
        // 保存发布包
    }
}
```

主要功能包括：

1. 将每个编译单元序列化为 Sui 模块
2. 处理初始化函数（如果指定）
3. 将模块和初始化脚本打包为 Sui 包
4. 序列化包为二进制 blob
5. 计算包哈希
6. 保存二进制 blob 和哈希到目标目录

### 类型定义 (types)

`types/` 目录包含 Sui 区块链特定的类型定义，包括：

- `module.rs` - 定义 Sui 模块结构
- `package.rs` - 定义 Sui 包结构，包含多个模块
- `function.rs` - 定义函数 ID 和相关结构
- `script.rs` - 定义脚本函数结构

这些类型负责表示 Sui 区块链上的 Move 代码结构，并提供序列化和反序列化功能。

## 输出结果

Sui 目标的输出结果保存在 `<package_path>/target/sui/release/` 目录，包括：

- `package.blob` - 序列化后的二进制包，可以直接部署到 Sui 区块链
- `hash.txt` - 包的加密哈希，用于验证包的完整性

## 使用方式

通常不需要直接使用这个模块，而是通过 `build_package` 函数指定目标类型：

```rust
move_web::build_package(
    package_path,
    dep_dirs,
    address_maps,
    &vec!["sui"], // 指定 Sui 作为目标
    test_mode,
    init_function,
)
```

或者在 JavaScript API 中使用：

```js
const mp = new MovePackage(wasmfs, {
  packagePath: "/path/to/package",
  test: false,
});

await mp.build(); // 默认使用 Sui 目标
``` 