# examples 目录

这个目录包含 sui-move-js 的示例项目，演示如何使用该库进行 Move 代码的编译和反汇编。

## 目录结构

- `my-counter/` - 演示如何将 Move 包编译为二进制 blob 的示例项目
- `disassemble/` - 演示如何反汇编 Move 字节码的示例项目

## 示例说明

### my-counter 示例

这个示例演示了如何：

1. 创建一个 Move 包
2. 设置依赖和地址映射
3. 使用 sui-move-js 编译 Move 代码
4. 获取编译后的二进制 blob 和哈希

示例位于 `my-counter/` 目录，可以通过以下命令运行：

```bash
cd examples/my-counter/
yarn install
yarn dev
```

这将启动一个 Web 应用程序，显示编译结果。

### disassemble 示例

这个示例演示了如何：

1. 获取 Move 字节码
2. 使用 sui-move-js 反汇编字节码
3. 显示反汇编结果

示例位于 `disassemble/` 目录，可以通过以下命令运行：

```bash
cd examples/disassemble/
yarn install
yarn dev
```

这将启动一个 Web 应用程序，允许您输入字节码并查看反汇编结果。

## 学习目标

通过这些示例，您可以学习：

1. 如何在 Web 应用程序中集成 sui-move-js
2. 如何管理 Move 包的依赖和配置
3. 如何编译和反汇编 Move 代码
4. 如何处理编译结果和反汇编输出

这些示例是理解和使用 sui-move-js 库的最佳起点。 