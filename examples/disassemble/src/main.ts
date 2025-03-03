import './style.css'

import { WasmFs } from '@wasmer/wasmfs'
import { Disassemble } from '@movefuns/move-js'

const startDisassembleTask = async (app: HTMLDivElement) => {
  const wasmfs = new WasmFs()
  const dp = new Disassemble(wasmfs)

  // Create container with styling
  const container = document.createElement('div')
  container.style.maxWidth = '800px'
  container.style.margin = '2rem auto'
  container.style.padding = '0 1rem'
  container.style.fontFamily = 'Arial, sans-serif'
  app.appendChild(container)

  // Add welcome title with enhanced styling
  const titleDiv = document.createElement('h1')
  titleDiv.textContent = 'Welcome to Sui Disassembler'
  titleDiv.style.textAlign = 'center'
  titleDiv.style.color = '#2d3748'
  titleDiv.style.marginBottom = '2rem'
  titleDiv.style.fontSize = '2.5rem'
  titleDiv.style.fontWeight = '600'
  titleDiv.style.letterSpacing = '0.025em'
  titleDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.1)'
  titleDiv.style.padding = '1rem 0'
  titleDiv.style.borderBottom = '3px solid #4299e1'
  container.appendChild(titleDiv)

  // Create file input section
  const inputContainer = document.createElement('div');
  inputContainer.style.marginBottom = '2rem';
  container.appendChild(inputContainer);

  const inputLabel = document.createElement('label');
  inputLabel.textContent = 'Select Move Bytecode File (.mv)';
  inputLabel.style.display = 'block';
  inputLabel.style.marginBottom = '0.5rem';
  inputLabel.style.fontWeight = 'bold';
  inputLabel.style.textAlign = 'left'
  inputContainer.appendChild(inputLabel);

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.mv'
  fileInput.style.width = '100%'
  fileInput.style.padding = '0.5rem'
  fileInput.style.border = '1px solid #ccc';
  inputContainer.appendChild(fileInput)

  // Create output display
  const outputDiv = document.createElement('pre')
  outputDiv.style.backgroundColor = '#2b2b2b'
  outputDiv.style.color = '#f8f8f2'
  outputDiv.style.padding = '1.5rem'
  outputDiv.style.borderRadius = '8px'
  outputDiv.style.overflow = 'auto'
  outputDiv.style.maxHeight = '70vh'
  outputDiv.style.margin = '0 auto'
  outputDiv.style.width = '100%'
  outputDiv.style.textAlign = 'left'
  container.appendChild(outputDiv)

  // Handle file upload
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const hexString = Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')

      dp.disassemble(file.name, hexString, (ok: boolean, data: string) => {
        outputDiv.textContent = ok ? data : `Error disassembling code: ${data}`
        outputDiv.style.color = ok ? '#f8f8f2' : '#ff6b6b'
      })
    } catch (error) {
      outputDiv.textContent = `Error: ${
        error instanceof Error ? error.message : String(error)
      }`
      outputDiv.style.color = '#ff6b6b'
    }
  })
}

const app = document.querySelector<HTMLDivElement>('#app')!
startDisassembleTask(app)
