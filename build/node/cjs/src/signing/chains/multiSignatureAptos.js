"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ed25519_1 = require("@noble/ed25519");
const constants_1 = require("../../constants");
class MultiSignatureAptosSigner {
    constructor(publicKey, collectSignatures) {
        this.ownerLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.MULTIAPTOS].pubLength;
        this.signatureLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.MULTIAPTOS].sigLength;
        this.signatureType = constants_1.SignatureConfig.MULTIAPTOS;
        this._publicKey = publicKey;
        this.collectSignatures = collectSignatures;
    }
    get publicKey() {
        return this._publicKey;
    }
    sign(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { signatures, bitmap: bits } = yield this.collectSignatures(message);
            // Bits are read from left to right. e.g. 0b10000000 represents the first bit is set in one byte.
            // The decimal value of 0b10000000 is 128.
            const firstBitInByte = 128;
            const bitmap = new Uint8Array([0, 0, 0, 0]);
            // Check if duplicates exist in bits
            const dupCheckSet = new Set();
            bits.forEach((bit) => {
                if (bit >= 32) {
                    throw new Error(`Invalid bit value ${bit}.`);
                }
                if (dupCheckSet.has(bit)) {
                    throw new Error("Duplicated bits detected.");
                }
                dupCheckSet.add(bit);
                const byteOffset = Math.floor(bit / 8);
                let byte = bitmap[byteOffset];
                byte |= firstBitInByte >> bit % 8;
                bitmap[byteOffset] = byte;
            });
            const signature = Buffer.alloc(this.signatureLength);
            let sigPos = 0;
            for (let i = 0; i < 32; i++) {
                if (bits.includes(i)) {
                    signature.set(signatures[sigPos++], i * 64);
                }
            }
            signature.set(bitmap, this.signatureLength - 4);
            return signature;
        });
    }
    static verify(pk, message, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const signatureLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.MULTIAPTOS].sigLength;
            const bitmapPos = signatureLength - 4;
            const signatures = signature.slice(0, bitmapPos);
            const encodedBitmap = signature.slice(bitmapPos);
            let oneFalse = false;
            for (let i = 0; i < 32; i++) {
                // check bitmap
                const bucket = Math.floor(i / 8);
                const bucketPos = i - bucket * 8;
                const sigIncluded = (encodedBitmap[bucket] & (128 >> bucketPos)) !== 0;
                if (sigIncluded) {
                    const signature = signatures.slice(i * 64, (i + 1) * 64);
                    const pubkey = pk.slice(i * 32, (i + 1) * 32);
                    if (!(yield (0, ed25519_1.verify)(Buffer.from(signature), Buffer.from(message), Buffer.from(pubkey))))
                        oneFalse = true;
                }
            }
            return !oneFalse;
        });
    }
}
exports.default = MultiSignatureAptosSigner;
//# sourceMappingURL=multiSignatureAptos.js.map