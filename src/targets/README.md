# targets 目录

这个目录包含 sui-move-js 支持的各种编译目标的实现，用于将编译后的 Move 代码输出为特定格式。

## 目录结构

- `target.rs` - 定义了 `Target` trait 和 `TargetType` 枚举，作为编译目标的抽象接口
- `mod.rs` - 模块声明文件
- `sui/` - Sui 区块链目标的具体实现

## 功能概述

### Target 抽象接口

`target.rs` 中定义了 `Target` trait，它是所有编译目标必须实现的接口：

```rust
pub trait Target {
    fn output(
        self,
        units: &[CompiledUnit],
        dest_path: &Path,
        init_function: &str,
    ) -> anyhow::Result<()>;
}
```

这个接口要求每个目标实现 `output` 方法，该方法接收编译单元、目标路径和初始化函数名称，并将编译结果输出为特定格式。

### TargetType 枚举

`TargetType` 枚举定义了支持的编译目标类型：

```rust
#[derive(Debug)]
pub enum TargetType {
    Sui,
    Unknown,
}
```

目前主要支持 Sui 区块链作为编译目标。

### Sui 目标实现

`sui/` 目录包含 Sui 区块链的目标实现，包括：

- `mod.rs` - 实现了 `Target` trait 的 `SuiTarget` 结构体
- `types/` - Sui 特定的类型定义，如模块、包、函数等

## 添加新目标

如果要添加新的编译目标，需要以下步骤：

1. 在 `targets/` 目录下创建新的子目录
2. 实现 `Target` trait
3. 在 `TargetType` 枚举中添加新类型
4. 在 `output` 函数中处理新类型

编译目标负责将通用的 Move 编译单元转换为特定平台所需的格式，如二进制 blob、源码映射等。 