import { WasmFs } from '@wasmer/wasmfs'
import { Move } from '../pkg/move'

// 反汇编接口定义
export interface IDisassemble {
    // 将字节码反汇编为可读代码
    disassemble(
        name: string,           // 文件名
        bytecode: string,       // 字节码字符串
        callback: (ok: boolean, data: string) => void  // 回调函数
    ): Promise<void>
}

// 反汇编类实现
export class Disassemble implements IDisassemble {
    private wasmfs: WasmFs  // WebAssembly文件系统

    // 构造函数
    constructor(wasmfs: WasmFs) {
        this.wasmfs = wasmfs
    }

    // 反汇编方法实现
    public async disassemble(
        name: string,           // 文件名
        bytecode: string,       // 字节码字符串
        callback: (ok: boolean, data: string) => void  // 回调函数，返回结果
    ): Promise<void> {
        // 创建工作目录
        const root = '/workspace/disassemble/'
        this.wasmfs.fs.mkdirpSync(root)

        // 将字节码写入文件
        const codePath = root + name
        this.wasmfs.fs.writeFileSync(codePath, bytecode)

        // 创建Move命令行实例
        const cli = new Move(this.wasmfs, {
            pwd: '/workspace/disassemble/',
            preopens: ['/workspace'],
        })

        // 执行反汇编命令
        await cli.run(['--', 'disassemble', '--file_path', codePath])

        // 检查成功结果文件是否存在
        const ntfExists = this.wasmfs.fs.existsSync(codePath + '.d')

        // 读取并返回结果
        if (ntfExists) {
            // 读取成功结果文件，扩展名为.d
            await this.wasmfs.fs.readFile(codePath + '.d', (_, v) =>
                callback(true, v?.toString())
            )
        } else {
            // 读取错误结果文件，扩展名为.e
            await this.wasmfs.fs.readFile(codePath + '.e', (_, v) =>
                callback(false, v?.toString())
            )
        }
    }
}
