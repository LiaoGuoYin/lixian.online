// import { vscodeService } from "@/features/vscode/api/VSCodeService";
// import { ExtensionInfo } from "@/features/vscode/types";
// import { create } from "zustand";

// interface VSCodeStoreState {
//   extensionInfo: ExtensionInfo;
//   extensionVersionList: Array<string>;
//   downloadUrl: string;

//   loadExtensionInfo: (url: string) => void;
//   loadExtensionVersionList: () => void;
//   getDownloadUrl: (version: string) => Promise<void>;
// }

// export const VSCodeStore = create<VSCodeStoreState>((set, get) => ({
//   extensionInfo: { publisher: "", extension: "", version: null },
//   extensionVersionList: [],
//   downloadUrl: "",

//   loadExtensionInfo: (url: string) => {
//     const { publisher, extension } = vscodeService.extractExtensionInfo(url);
//     set({ extensionInfo: { publisher, extension, version: null } });
//   },

//   loadExtensionVersionList: async () => {
//     if (!get().extensionInfo.publisher || !get().extensionInfo.extension) {
//       throw new Error("Extension info not loaded");
//     }

//     const versionInfo = await vscodeService.getVersionList(get().extensionInfo);
//     set({ extensionVersionList: versionInfo.versionList });
//   },

//   getDownloadUrl: async (version: string): Promise<void> => {
//     // find version in extensionVersionList
//     const versionIndex = get().extensionVersionList.findIndex(
//       (v) => v === version
//     );
//     if (versionIndex === -1) {
//       throw new Error("Version not found");
//     }
//     set({ extensionInfo: { ...get().extensionInfo, version } });

//     const downloadUrl = await vscodeService.getDownloadUrl(get().extensionInfo);
//     set({ downloadUrl });
//   },
// }));
