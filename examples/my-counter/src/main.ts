import './style.css'

import { WasmFs } from '@wasmer/wasmfs'
import { Git, MovePackage } from '@movefuns/move-js'

const startWasiTask = async (app: HTMLDivElement) => {
  const wasmfs = new WasmFs()
  const git = new Git(wasmfs)

  await git.download('/data/framework.zip', '/workspace/framework')
  await git.download('/data/counter.zip', '/workspace/my-counter')

  const mp = new MovePackage(wasmfs, {
    packagePath: '/workspace/my-counter',
    test: false,
    alias: new Map([['Sui', '/workspace/framework/sui-framework']]),
  })

  await mp.build()

  const blobBuf = wasmfs.fs.readFileSync(
    '/workspace/my-counter/target/sui/release/package.blob'
  )
  const hash = wasmfs.fs.readFileSync(
    '/workspace/my-counter/target/sui/release/hash.txt'
  )
  const base64Data = blobBuf.toString('base64')

  // get hex of blob buf with 0x prefix
  const hex = blobBuf.toString('hex').replace(/^/, '0x')

  app.innerHTML = `
    <div class="container">
      <h1 class="title">Sui Wasm Builder —— Example: counter</h1>
      <div class="info-grid">
        <div class="info-card">
          <h3>Hex</h3>
          <div class="code-block">${hex}</div>
        </div>
        <div class="info-card">
          <h3>Buffer</h3>
          <div class="code-block">${blobBuf}</div>
        </div>
        <div class="info-card">
          <h3>Base64</h3>
          <div class="code-block">${base64Data}</div>
        </div>
        <div class="info-card">
          <h3>Hash</h3>
          <div class="code-block">${hash}</div>
        </div>
      </div>
    </div>
  `
}

const app = document.querySelector<HTMLDivElement>('#app')!
startWasiTask(app)
