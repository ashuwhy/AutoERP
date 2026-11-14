// The hidden page cdcPdfVerdict (cdc-common.js) puts on the notice board. Firefox refuses pdf.js in a content
// script, so it runs here, from the extension's own origin, with a real worker. Each message brings a PDF's
// bytes, the roll and a port; only "in", "out" or "none" goes back. The text never leaves this function.
import { getDocument, PDFWorker } from "../lib/pdfjs/pdf.min.mjs";

// One worker for every read, handed to each getDocument. A task that found it through
// GlobalWorkerOptions.workerPort destroys it on task.destroy(), under the reads still running.
const worker = new PDFWorker({ port: new Worker(new URL("../lib/pdfjs/pdf.worker.min.mjs", import.meta.url), { type: "module" }) });

// The same shapes and edges as cdcRollIn in cdc-common.js, which this page cannot load. Only a digit may
// touch a roll, so a roll glued to a name still counts and one digit more or less does not.
const ROLL = /^\d{2}[A-Z]{2}\d[0-9A-Z]{2}\d{2}$/;
const ANY_ROLL = /(?<!\d)\d{2}[A-Z]{2}\d[0-9A-Z]{2}\d{2}(?!\d)/;

async function verdict(bytes, roll) {
    const task = getDocument({ data: new Uint8Array(bytes), worker, isEvalSupported: false, disableFontFace: true });
    try {
        const doc = await task.promise;
        const pages = [];
        for (let n = 1; n <= doc.numPages; n++) {
            const { items } = await (await doc.getPage(n)).getTextContent();
            pages.push(items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
        }
        const text = pages.join("\n").toUpperCase();
        if (ROLL.test(roll) && new RegExp(`(?<!\\d)${roll}(?!\\d)`).test(text)) return "in";
        return ANY_ROLL.test(text) ? "out" : "none";
    } catch {
        return "none";
    } finally {
        task.destroy();
    }
}

addEventListener("message", async ({ data, ports: [port] }) => {
    if (!port) return;
    port.postMessage(await verdict(data.bytes, data.roll));
    port.close();
});
