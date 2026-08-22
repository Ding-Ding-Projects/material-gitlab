import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [input] = process.argv.slice(2);
if (!input) {
  throw new Error('Expected one Windows PE executable path.');
}

const executablePath = resolve(input);
const bytes = await readFile(executablePath);

if (bytes.length < 0x40 || bytes.toString('ascii', 0, 2) !== 'MZ') {
  throw new Error(`Expected a Windows PE executable: ${executablePath}`);
}

const peOffset = bytes.readUInt32LE(0x3c);
if (peOffset + 24 > bytes.length || bytes.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
  throw new Error(`Invalid PE header: ${executablePath}`);
}

const optionalHeader = peOffset + 24;
const magic = bytes.readUInt16LE(optionalHeader);
const dataDirectoryOffset = magic === 0x10b ? optionalHeader + 96 : magic === 0x20b ? optionalHeader + 112 : 0;
if (!dataDirectoryOffset || dataDirectoryOffset + 40 > bytes.length) {
  throw new Error(`Unsupported PE optional-header format: ${executablePath}`);
}

const certificateTable = dataDirectoryOffset + 32;
const certificateOffset = bytes.readUInt32LE(certificateTable);
const certificateSize = bytes.readUInt32LE(certificateTable + 4);
if (certificateOffset !== 0 || certificateSize !== 0) {
  throw new Error(`Authenticode certificate table is present: ${executablePath}`);
}

console.log(`Unsigned PE verified: ${executablePath}`);
