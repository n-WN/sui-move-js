import { WasmFs } from '@wasmer/wasmfs'
import { Git } from '../pkg/git'
import { Move } from '../pkg/move'

describe('Move', () => {
  let wasmfs: WasmFs
  let git: Git

  beforeEach(async () => {
    wasmfs = new WasmFs()
    git = new Git(wasmfs)
  })

  it('cli build my-counter example should be ok', async () => {
    await git.download('./base/test/data/framework.zip', '/workspace/framework')
    await git.download('./base/test/data/counter.zip', '/workspace/my-counter')

    let cli = new Move(wasmfs, {
      pwd: '/workspace/my-counter',
      preopens: ['/workspace'],
    })

    const listDir = (path: string) => {
      const files = wasmfs.fs.readdirSync(path)
      const result: string[] = []
      files.forEach((file) => {
        const fullPath = `${path}/${file}`
        try {
          const stats = wasmfs.fs.statSync(fullPath)
          if (stats.isDirectory()) {
            result.push(...listDir(fullPath))
          } else {
            result.push(fullPath)
          }
        } catch (error) {
          // Skip files with errors
        }
      })
      return result
    }

    const stdlib = listDir('/workspace/framework/move-stdlib/sources')
    const suiFramework = listDir('/workspace/framework/sui-framework/sources')
    const dependencyDirs = stdlib.concat(suiFramework).join(",")

    await cli.run([
      '--',
      'build',
      '--dependency_dirs',
      dependencyDirs,
      '--address_maps',
      'counter:0x0,std:0x1,sui:0x2',
    ])

    const ntfExists = wasmfs.fs.existsSync(
      '/workspace/my-counter/target/sui/release/package.blob'
    )
    expect(ntfExists).toBeTruthy()
  })
})
