# pkg 目录

这个目录包含 sui-move-js 的 TypeScript/JavaScript 部分实现，它封装了 WebAssembly 模块并提供了友好的 JavaScript API。

## 目录结构

- `move_bg.wasm` - 编译后的 WebAssembly 二进制文件，包含 Rust 部分的核心功能
- `move_bg.js` - WebAssembly 模块的加载器
- `move.ts` - WebAssembly 模块的 TypeScript 封装，负责与 WASI 接口交互
- `package.ts` - Move 包管理和构建功能的实现
- `disassemble.ts` - 反汇编功能的实现
- `git.ts` - Git 操作相关功能
- `index.ts` - 主入口文件，导出所有功能模块

## 功能概述

### Move 封装 (move.ts)

`Move` 类是与 WebAssembly 模块交互的主要接口，它：

1. 初始化 WASI 环境
2. 配置文件系统访问
3. 执行 WebAssembly 命令
4. 处理标准输入/输出

### 包管理 (package.ts)

`MovePackage` 类提供 Move 包的管理功能，包括：

1. 解析 Move.toml 配置文件
2. 收集依赖和地址映射
3. 调用构建命令
4. 处理输出结果

这个类负责将 JavaScript 对象和参数转换为 WebAssembly 模块可以理解的格式。

### 反汇编功能 (disassemble.ts)

`Disassemble` 类提供将 Move 字节码反汇编为可读代码的功能，它：

1. 将字节码写入虚拟文件系统
2. 调用 WebAssembly 模块的反汇编功能
3. 解析输出结果

## 使用方式

这些 TypeScript 模块被编译为 JavaScript，可以在 Node.js 或浏览器环境中使用。典型的使用方式是：

```ts
import { WasmFs } from '@wasmer/wasmfs';
import { MovePackage } from '@movefuns/move-js';

// 创建虚拟文件系统
const wasmfs = new WasmFs();

// 创建并编译 Move 包
const mp = new MovePackage(wasmfs, {
  packagePath: "/path/to/package",
  test: false
});

await mp.build();
```

## 实现原理

1. 虚拟文件系统: 使用 `@wasmer/wasmfs` 在浏览器中模拟文件系统
2. WASI 接口: 使用 `@wasmer/wasi` 提供系统调用能力
3. WebAssembly: 运行编译后的 Rust 代码 