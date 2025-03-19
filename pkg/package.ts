import * as path from 'path'
import * as TOML from '@iarna/toml'
import { WasmFs } from '@wasmer/wasmfs'
import { Move } from '../pkg/move'

// 依赖项接口定义，可以是git仓库或本地目录
export interface IDependency {
  git?: string
  rev?: string
  local?: string
}

// Move包接口定义
export interface IMovePackage {
  name?: string         // 包名
  version?: string      // 版本
  addresses?: Map<string, string>  // 地址映射
  dependencies?: Map<string, IDependency>  // 依赖
  devDependencies?: Map<string, IDependency>  // 开发依赖

  build(): void         // 构建方法
}

// Move选项类型定义
export type MoveOptions = {
  packagePath: string   // 包路径
  test: boolean         // 是否测试模式
  alias?: Map<string, string>  // 别名映射
  initFunction?: string  // 初始化函数
}

// Move包实现类
export class MovePackage implements IMovePackage {
  public name?: string
  public version?: string
  public addresses?: Map<string, string>
  public devDependencies?: Map<string, IDependency>
  public dependencies?: Map<string, IDependency>

  private wasmfs: WasmFs
  private packagePath: string
  private packageAlias: Map<string, string>
  private test: boolean
  private initFunction?: string

  // 构造函数，初始化包配置
  constructor(wasmfs: WasmFs, opts: MoveOptions) {
    this.wasmfs = wasmfs
    this.packagePath = opts.packagePath

    // 读取并解析 Move.toml 配置文件
    const tomlPath = path.join(opts.packagePath, 'Move.toml')
    const tomlContent = wasmfs.fs.readFileSync(tomlPath, 'utf-8')
    this.parseToml(tomlContent.toString())

    // 处理别名映射
    const packageAlias = new Map<string, string>()
    if (opts.alias != null) {
      opts.alias.forEach((val: string, key: string) => {
        packageAlias.set(key, val)
      })
    }

    this.packageAlias = packageAlias
    this.test = opts.test
    this.initFunction = opts.initFunction
  }

  // 解析TOML配置文件
  parseToml(tomlContent: string): void {
    const toml = TOML.parse(tomlContent)

    // 解析包名
    // @ts-ignore
    this.name = toml['package']['name'] as string

    // 解析版本
    // @ts-ignore
    this.version = toml['package']['version'] as string

    // 解析地址映射
    this.addresses = new Map<string, string>()
  
    // @ts-ignore
    for (const key in toml['addresses']) {
      if (toml['addresses'].hasOwnProperty(key)) {
        // @ts-ignore
        this.addresses.set(key, toml['addresses'][key])
      }
    }

    // 解析开发依赖
    this.devDependencies = new Map<string, IDependency>()
    this.parseDeps(this.devDependencies, toml['dev-dependencies'])

    // 解析依赖
    this.dependencies = new Map<string, IDependency>()
    this.parseDeps(this.dependencies, toml['dependencies'])
  }

  // 解析依赖配置
  parseDeps(thisDeps: Map<string, IDependency>, tomlDeps: any): void {
    // @ts-ignore
    for (const key in tomlDeps) {
      if (!tomlDeps.hasOwnProperty(key)) {
        continue
      }

      // @ts-ignore
      const dep = tomlDeps[key]

      if (dep != null) {
        const depInfo = {
          git: dep['git'],
          rev: dep['rev'],
          local: dep['local'],
        }

        thisDeps.set(key, depInfo)
      }
    }
  }

  // 构建包方法
  public async build(): Promise<void> {
    // 获取所有依赖和地址映射
    const deps = this.getAllDeps()
    const addresses = this.getAllAddresses()

    // 调用构建方法
    await this.buildPackage(this.wasmfs, this.packagePath, deps, addresses)
  }

  // 获取所有依赖
  public getAllDeps(): Set<string> {
    const deps = new Set<string>()

    // 收集依赖和开发依赖
    this.collectDependencies(deps, this.dependencies)
    this.collectDependencies(deps, this.devDependencies)

    return deps
  }

  // 递归收集依赖
  collectDependencies(allDeps: Set<string>, modules: Map<string, IDependency>) {
    const packageAlias = this.packageAlias

    if (modules) {
      modules.forEach((dep: IDependency, key: string) => {
        // 处理别名映射的依赖
        const aliasPath = packageAlias.get(key)

        if (aliasPath != null) {
          allDeps.add(aliasPath)

          // 递归收集子依赖
          new MovePackage(this.wasmfs, {
            packagePath: aliasPath,
            test: false,
          })
            .getAllDeps()
            .forEach((depName: string) => {
              allDeps.add(depName)
            })

          return
        }

        // 处理本地依赖
        if (dep.local) {
          const depPath = path.join(this.packagePath, dep.local)
          allDeps.add(depPath)

          // 递归收集子依赖
          new MovePackage(this.wasmfs, {
            packagePath: depPath,
            test: false,
          })
            .getAllDeps()
            .forEach((depName: string) => {
              allDeps.add(depName)
            })
        }
      })
    }
  }

  // 获取所有地址映射
  public getAllAddresses(): Map<string, string> {
    const allAddresses = new Map<string, string>()

    // 添加自身的地址映射
    this.addresses.forEach((val: string, key: string) => {
      allAddresses.set(key, val)
    })

    // 收集依赖和开发依赖的地址映射
    this.collectAddresses(allAddresses, this.dependencies)
    this.collectAddresses(allAddresses, this.devDependencies)

    return allAddresses
  }

  // 递归收集地址映射
  collectAddresses(
    allAddresss: Map<string, string>,
    modules: Map<string, IDependency>
  ) {
    const packageAlias = this.packageAlias

    if (modules) {
      modules.forEach((dep: IDependency, key: string) => {
        // 处理别名映射的依赖
        const aliasPath = packageAlias.get(key)

        if (aliasPath != null) {
          const mp = new MovePackage(this.wasmfs, {
            packagePath: aliasPath,
            test: false,
          })
          const addresses = mp.getAllAddresses()
          if (addresses) {
            addresses.forEach((addr: string, name: string) => {
              allAddresss.set(name, addr)
            })
          }

          return
        }

        // 处理本地依赖
        if (dep.local) {
          const depPath = path.join(this.packagePath, dep.local)
          const mp = new MovePackage(this.wasmfs, {
            packagePath: depPath,
            test: false,
          })

          const addresses = mp.getAllAddresses()
          if (addresses) {
            addresses.forEach((addr: string, name: string) => {
              allAddresss.set(name, addr)
            })
          }
        }
      })
    }
  }

  // 构建包方法实现
  async buildPackage(
    wasmfs: WasmFs,
    packagePath: string,
    deps: Set<string>,
    addresses: Map<string, string>
  ): Promise<void> {
    console.log('Building ', this.name)

    // 创建Move命令行实例
    const cli = new Move(wasmfs, {
      pwd: packagePath,
      preopens: ['/workspace'],
    })

    // 列出所有依赖目录
    let depMoves = [];
    for (const dep of Array.from(deps)) {
      depMoves.push(this.listDir(wasmfs, dep));
    }
    
    // 准备命令行参数
    const depDirs = depMoves.join(',')
    const addressMaps = new Array<string>()
    addresses.forEach((val: string, key: string) => {
      addressMaps.push(key + ':' + val)
    })
    const addressArgs = addressMaps.join(',')

    // 设置初始化函数
    let initFunction = ''
    if (this.initFunction) {
      initFunction = this.initFunction
    }

    console.log('build addresses:', addressArgs)
    console.log('is test:', this.test)

    await cli.run([
      '--',
      'build',
      '--dependency_dirs',
      depDirs,
      '--address_maps',
      addressArgs,
      '--test',
      String(this.test),
      '--init_function',
      initFunction,
    ])
  }

  listDir(wasmfs: WasmFs, path: string) {
    const files = wasmfs.fs.readdirSync(path)
    const result: string[] = []
    files.forEach((file) => {
      const fullPath = `${path}/${file}`
      try {
        const stats = wasmfs.fs.statSync(fullPath)
        if (stats.isDirectory()) {
          result.push(...this.listDir(wasmfs, fullPath))
        } else if (fullPath.endsWith('.move')) {
          result.push(fullPath)
        }
      } catch (error) {
        // Skip files with errors
      }
    })
    return result
  }
}
