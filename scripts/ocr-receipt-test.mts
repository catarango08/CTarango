import { createWorker } from 'tesseract.js';
import { parseReceipt, sumCheck } from '../src/lib/receipt-parse.ts';
const w = await createWorker('eng');
const { data } = await w.recognize('/workspace/screens/photos-receipts/test-receipt.jpg', {}, { blocks: true, text: true });
await w.terminate();
const lines = (data.blocks ?? []).flatMap((b:any)=>b.paragraphs.flatMap((p:any)=>p.lines.map((l:any)=>({text:l.text,confidence:l.confidence}))));
console.log(data.text); const p = parseReceipt(lines.length?lines:data.text.split('\n').map(t=>({text:t,confidence:data.confidence})));
console.log(JSON.stringify(p,null,1)); console.log(sumCheck(p.items.reduce((s,i)=>s+i.qty*i.unitCost,0),{subtotal:p.subtotal.value,tax:p.tax.value,total:p.total.value}));
