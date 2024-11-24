import {Button,DialogActions,DialogContent,DialogTitle,FormControl,FormHelperText,InputLabel,MenuItem,Select,TextField} from '@mui/material';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { ethers, BrowserProvider } from 'ethers';
import { PinataSDK } from "pinata-web3";
import React, { useState } from 'react';
import contractABI from '../contractABI.json';

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;


const pinata = new PinataSDK({
    pinataJwt: process.env.REACT_APP_PINATA_JWT,
    pinataGateway: process.env.REACT_APP_PINATA_GATEWAY,
});

// async function encryptFile(file, secretKey) {
//     const reader = new FileReader();
//     return new Promise((resolve, reject) => {
//         reader.onload = () => {
//             try {
//                 const wordArray = CryptoJS.lib.WordArray.create(reader.result);
//                 const iv = CryptoJS.lib.WordArray.random(16);
//                 const encrypted = CryptoJS.AES.encrypt(wordArray, secretKey, {
//                     iv: iv,
//                     mode: CryptoJS.mode.CBC,
//                     padding: CryptoJS.pad.Pkcs7
//                 });
//                 const combinedData = iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
//                 const blob = new Blob([combinedData], { type: 'application/octet-stream' });
//                 const encryptedFile = new File([blob], `${file.name}.encrypted`, {
//                     type: 'application/octet-stream'
//                 });
//                 encryptedFile.originalType = file.type;
//                 encryptedFile.originalName = file.name;
//                 resolve(encryptedFile);
//             } catch (error) {
//                 reject(error);
//             }
//         };
//         reader.onerror = () => reject(new DOMException("Problem parsing input file."));
//         reader.readAsArrayBuffer(file);
//     });
// }

// async function decryptFile(encryptedFile, secretKey) {
//     const reader = new FileReader();
//     return new Promise((resolve, reject) => {
//         reader.onload = () => {
//             try {
//                 const encryptedData = reader.result;
//                 const encryptedWordArray = CryptoJS.enc.Base64.parse(encryptedData);
//                 const iv = CryptoJS.lib.WordArray.create(
//                     encryptedWordArray.words.slice(0, 4),
//                     16
//                 );
//                 const ciphertext = CryptoJS.lib.WordArray.create(
//                     encryptedWordArray.words.slice(4)
//                 );
//                 const decrypted = CryptoJS.AES.decrypt(
//                     { ciphertext: ciphertext },
//                     secretKey,
//                     { iv: iv }
//                 );
//                 const typedArray = new Uint8Array(decrypted.sigBytes);
//                 for (let i = 0; i < decrypted.sigBytes; i++) {
//                     typedArray[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
//                 }
//                 const originalName = encryptedFile.originalName || encryptedFile.name.replace('.encrypted', '');
//                 const originalType = encryptedFile.originalType || 'application/octet-stream';
//                 const blob = new Blob([typedArray], { type: originalType });
//                 const decryptedFile = new File([blob], originalName, { type: originalType });
//                 resolve(decryptedFile);
//             } catch (error) {
//                 reject(error);
//             }
//         };
//         reader.onerror = () => reject(new DOMException("Problem parsing input file."));
//         reader.readAsText(encryptedFile);
//     });
// }

async function uploadToIPFS(file) {
    const upload = await pinata.upload.file(file);
    return { cid: upload.IpfsHash, originalName: file.name, originalType: file.type };
}

async function downloadFromIPFS(ipfsHash){
    try {
        const res=await pinata.gateways.get(ipfsHash);
        console.log(res);
        const downloadedBlob = new Blob([res.data], { type: res.contentType });
        const downloadedFile = new File([downloadedBlob], "download_file", { type: res.contentType });
        return downloadedFile;
    }
    catch(err){
        console.log(err);
    }
}
// async function downloadFromIPFS(ipfsHash, secretKey) {
//     try {
//         // Fetch file from IPFS
//         const response = await pinata.gateways.get(ipfsHash);

//         // Check if response.data is an object or a JSON string
//         const fileData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

//         // Extract Base64-encoded content
//         const base64Content = fileData.content;

//         // Decode Base64 string to binary data
//         const byteString = atob(base64Content.split(',')[1]); // Ignore the `data:application/octet-stream;base64,` prefix
//         const ab = new ArrayBuffer(byteString.length);
//         const ia = new Uint8Array(ab);
//         for (let i = 0; i < byteString.length; i++) {
//             ia[i] = byteString.charCodeAt(i);
//         }

//         // Create a Blob for the encrypted file
//         const encryptedBlob = new Blob([ab], { type: 'application/octet-stream' });
//         const encryptedFile = new File([encryptedBlob], "encrypted", { type: 'application/octet-stream' });

//         // Decrypt the file using the symmetric key
//         return await decryptFile(encryptedFile, secretKey);
        
//     } catch (error) {
//         console.error("Error in downloadFromIPFS:", error);
//         throw new Error("Failed to download or decrypt the file.");
//     }
// }




const FileUploader = ({ onClose, onUpload }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dataType, setDataType] = useState('PHR');
    const [ipfsHash, setIpfsHash] = useState('');
    // const [symmetricKey, setSymmetricKey] = useState('');
    const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
    const pinataApiSecret = process.env.REACT_APP_PINATA_API_SECRET;
    
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
    };

    const handleDataTypeChange = (event) => setDataType(event.target.value);

    const downloadAndDecrypt = async (cid) => {
        try {
            const downloadFile = await downloadFromIPFS(cid);
            const url = URL.createObjectURL(downloadFile);
            const link = document.createElement('a');
            link.href = url;
            link.download = downloadFile.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading or decrypting file:', error);
            alert('Failed to download or decrypt the file.');
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file to upload.');
            return;
        }

        setLoading(true);
        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const userPublicKey = await signer.getAddress();
            // const generatedKey = CryptoJS.lib.WordArray.random(32).toString();
            // setSymmetricKey(generatedKey);

            // const encryptedFile = await encryptFile(selectedFile, generatedKey);
            // const hashIndex = CryptoJS.SHA256(selectedFile.name).toString();

            // const metadata = {
            //     publicKey: userPublicKey,
            //     dataType,
            //     hashIndex,
            // };
            // const reader = new FileReader();
            // const fileContent = await new Promise((resolve) => {
            //     reader.onloadend = () => resolve(reader.result);
            //     reader.readAsDataURL(encryptedFile);
            // });

            // const toUploadFile = new File(
            //     [JSON.stringify({ metadata, content: fileContent })],
            //     encryptedFile.name,
            //     { type: 'application/json' }
            // );
            const uploadedData = await uploadToIPFS(selectedFile);
            setIpfsHash(uploadedData.cid);

            // Prepare transaction data for signing
            const transactionData = JSON.stringify({
                publicKey: userPublicKey,
                dataType: dataType,
                ipfsHash
            });

            // Sign the transaction data with the user's Ethereum private key
            const signature = await signer.signMessage(transactionData);

            // Interact with blockchain and add the record
            const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
            const dataTypeEnum = getDataTypeEnum(dataType);
            // Call addPHRData function from the smart contract
            const tx = await contract.addPHRData(ipfsHash, dataTypeEnum, {
                gasLimit: 500000 // Adjust gas limit if necessary
            });
            await tx.wait();  // Wait for the transaction to be mined
            // After successful blockchain interaction, call the onUpload callback
            onUpload({ ipfsHash, dataType, owner: userPublicKey, signature });
            
            // Call the download and decrypt function immediately after upload
            // await downloadAndDecrypt(uploadedData.cid);
            
            console.log('File uploaded successfully.');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getDataTypeEnum = (dataType) => {
        switch (dataType) {
            case 'EHR':
                return 0;  // EHR corresponds to 0 in your contract
            case 'PHR':
                return 1;  // PHR corresponds to 1
            case 'LAB_RESULT':
                return 2;  // LAB_RESULT corresponds to 2
            case 'PRESCRIPTION':
                return 3;  // PRESCRIPTION corresponds to 3
            case 'IMAGING':
                return 4;  // IMAGING corresponds to 4
            default:
                return 1;  // Default to PHR
        }
    };

    return (
        <>
            <DialogTitle>Upload Health Record</DialogTitle>
            <DialogContent>
                <TextField type="file" onChange={handleFileChange} fullWidth />
                <FormControl fullWidth margin="normal">
                    <InputLabel id="data-type-label">Data Type</InputLabel>
                    <Select
                        labelId="data-type-label"
                        value={dataType}
                        onChange={handleDataTypeChange}
                        label="Data Type"
                    >
                        <MenuItem value="EHR">EHR (Electronic Health Record)</MenuItem>
                        <MenuItem value="PHR">PHR (Personal Health Record)</MenuItem>
                        <MenuItem value="LAB_RESULT">Lab Result</MenuItem>
                        <MenuItem value="PRESCRIPTION">Prescription</MenuItem>
                        <MenuItem value="IMAGING">Imaging</MenuItem>
                    </Select>
                    <FormHelperText>Select the type of health data</FormHelperText>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleFileUpload} variant="contained" color="primary" disabled={!selectedFile || loading}>
                    {loading ? 'Uploading...' : 'Upload & Download'}
                </Button>
            </DialogActions>
        </>
    );
};

export default FileUploader;
