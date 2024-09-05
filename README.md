# ANS-104 Bundles

A low level library for creating, editing, reading and verifying bundles.

See [ANS-104](https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-104.md) for more details.

## Installing the library

Using npm:

`npm install @ar.io/arbundles`

Using yarn:

`yarn add @ar.io/arbundles`

## Creating bundles

```ts
import { bundleAndSignData, createData } from "@ar.io/arbundles";

const dataItems = [createData("some data"), createData("some other data")];

const signer = new ArweaveSigner(jwk);

const bundle = await bundleAndSignData(dataItems, signer);
```
