import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import csvParser from "csv-parser"
import { MetaTransaction, SafeTransaction } from '@gnosis.pm/safe-contracts'
import { BigNumber, BigNumberish, Contract, ethers } from 'ethers'

const cliCacheDir = "cli_cache"

export const proposalFile = (safeTxHash: string) => `${safeTxHash}.proposal.json`
export const signaturesFile = (safeTxHash: string) => `${safeTxHash}.signatures.json`

export const writeToCliCache = async(key: string, content: any) => {
    const folder = path.join(process.cwd(), cliCacheDir)
    try {
        await fs.access(folder)
    } catch (e) {
        await fs.mkdir(folder);
    }
    await fs.writeFile(path.join(folder, key), JSON.stringify(content, null, 2))
}

export const writeJson = async(file: string, content: any) => {
    await fs.writeFile(file, JSON.stringify(content, null, 2))
}

export const writeTxBuilderJson = async(file: string, chainId: string, transactions: MetaTransaction[], name?: string, description?: string) => {
    return writeJson(file, {
        version: "1.0",
        chainId,
        createdAt: new Date().getTime(),
        meta: {
            name,
            description
        },
        transactions
    })
}

export const readFromCliCache = async(key: string): Promise<any> => {
    const content = await fs.readFile(path.join(process.cwd(), cliCacheDir, key), 'utf8')
    return JSON.parse(content)
}

export const loadSignatures = async(safeTxHash: string): Promise<Record<string, string>> => {
    try {
        return await readFromCliCache(signaturesFile(safeTxHash))
    } catch {
        return {}
    }
}

export const readCsv = async<T>(file: string): Promise<T[]> => new Promise((resolve, reject) => {
    const results: T[] = [];
    fsSync.createReadStream(file).pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("error", (err) => { reject(err) })
        .on("end", () => { resolve(results)})
})


export const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
    ]
}

export const _calculateSafeTransactionHash = (safe: Contract, safeTx: SafeTransaction, chainId: BigNumberish): string => {
    return ethers.utils._TypedDataEncoder.hash({ verifyingContract: safe.address, chainId }, EIP712_SAFE_TX_TYPE, safeTx)
}