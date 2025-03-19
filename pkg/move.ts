import { WASI, WASIPreopenedDirs } from '@wasmer/wasi/lib'
import browserBindings from '@wasmer/wasi/lib/bindings/browser'
import { WasmFs } from '@wasmer/wasmfs'
import loadMoveWasmModule from './move_bg'

// Move接口定义
export interface IMove {
  run(args?: string[]): Promise<any>
}

// Move选项接口定义
export interface IMoveOption {
  pwd?: string       // 工作目录
  preopens?: [string]  // 预先打开的目录列表
}

// Move类实现，用于在WebAssembly环境中执行Move命令
export class Move implements IMove {
  private wasmfs: WasmFs  // WebAssembly文件系统
  private opts?: IMoveOption  // 选项配置

  // 构造函数
  constructor(wasmfs: WasmFs, opts?: IMoveOption) {
    this.wasmfs = wasmfs
    this.opts = opts

    // 如果没有提供选项，创建默认配置
    if (this.opts == null) {
      this.wasmfs.fs.mkdirpSync('/tmp')
      this.opts = {
        pwd: '/tmp',
      }
    }
  }

  // 运行Move命令
  async run(args?: string[]): Promise<any> {
    const opts = this.opts

    // 配置WASI预打开目录
    const preopens: WASIPreopenedDirs = {}
    if (opts.preopens) {
      preopens[opts.pwd] = opts.pwd

      opts.preopens.forEach((value: string) => {
        preopens[value] = value
      })
    } else {
      preopens[opts.pwd] = opts.pwd
    }

    // 创建WASI实例
    const wasi = new WASI({
      preopens,

      // 传递给WebAssembly模块的参数
      // 第一个参数通常是要运行的WASI模块的文件路径
      args,

      // WASI模块可访问的环境变量
      env: {
        PWD: opts.pwd,
      },

      // WASI实例使用的绑定（fs, path等）
      bindings: {
        ...browserBindings,
        fs: this.wasmfs.fs,
      },
    })

    // 实例化WebAssembly文件
    const wasmModule = await loadMoveWasmModule()
    const instance = await WebAssembly.instantiate(wasmModule, {
      ...wasi.getImports(wasmModule),
    })

    try {
      // 启动WASI实例
      // @ts-ignore
      wasi.start(instance) 
    } catch (e) {
      console.error(e)
    }

    // 获取标准输出内容
    const stdout = await this.wasmfs.getStdOut()

    // 获取标准错误内容
    const stderr = await this.getStdErr()
    if (stderr) {
      console.error('Standard Error: \n' + stderr)
    }

    return stdout
  }

  // 获取标准错误输出
  async getStdErr() {
    const promise = new Promise((resolve) => {
      resolve(this.wasmfs.fs.readFileSync('/dev/stderr', 'utf8'))
    })

    return promise
  }
}
