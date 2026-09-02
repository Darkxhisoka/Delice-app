import { contextBridge, ipcRenderer } from 'electron';

require('./rt/electron-rt');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printThermal: (options: {
    html: string;
    silent?: boolean;
    printerName?: string;
    copies?: number;
    pageSize?: any;
  }) => ipcRenderer.invoke('print-thermal', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
