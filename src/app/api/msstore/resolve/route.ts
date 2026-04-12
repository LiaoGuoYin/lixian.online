import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { normalizeMSStoreDownloadUrl } from "@/features/msstore/download";
import { site } from "@/shared/lib/site";

type RequestType = "url" | "ProductId" | "PackageFamilyName" | "CategoryId";
type StoreRing = "WIF" | "WIS" | "RP" | "Retail";

// --- Input validation utilities ---

function isDisplayCatalogBigId(value: string): boolean {
  return /^[A-Za-z0-9]{12}$/.test(value);
}

function isStoreIdentifier(value: string): boolean {
  return /^[A-Za-z0-9]{12,16}$/.test(value);
}

function extractStoreIdentifierFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (isStoreIdentifier(trimmed)) {
    return trimmed.toUpperCase();
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const fromQuery =
    parsed.searchParams.get("productId") ??
    parsed.searchParams.get("productid") ??
    parsed.searchParams.get("itemId") ??
    parsed.searchParams.get("itemid");
  if (fromQuery && isStoreIdentifier(fromQuery)) {
    return fromQuery.toUpperCase();
  }

  const path = parsed.pathname;
  const patterns = [
    /\/detail\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
    /\/store\/productid\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
    /\/productid\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
  ];
  for (const pattern of patterns) {
    const matched = path.match(pattern);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  return null;
}

function normalizeStoreIdentifier(type: RequestType, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("query 不能为空");
  }

  switch (type) {
    case "url": {
      const storeIdentifier = extractStoreIdentifierFromUrl(trimmed);
      if (!storeIdentifier) {
        throw new Error("无法从 URL 提取应用标识");
      }
      return trimmed;
    }
    case "ProductId": {
      if (!isDisplayCatalogBigId(trimmed)) {
        throw new Error("无效 ProductId（需 12 位，例如 9N0DX20HK701）");
      }
      return trimmed.toUpperCase();
    }
    case "PackageFamilyName": {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*_[A-Za-z0-9]+$/.test(trimmed)) {
        throw new Error("无效 PackageFamilyName");
      }
      return trimmed;
    }
    case "CategoryId": {
      if (
        !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          trimmed,
        )
      ) {
        throw new Error("无效 CategoryId");
      }
      return trimmed.toLowerCase();
    }
    default:
      throw new Error("不支持的请求类型");
  }
}

function extractDisplayCatalogBigId(type: RequestType, query: string): string | null {
  if (type === "ProductId") {
    return query;
  }
  if (type === "url") {
    const storeIdentifier = extractStoreIdentifierFromUrl(query);
    return storeIdentifier && isDisplayCatalogBigId(storeIdentifier)
      ? storeIdentifier
      : null;
  }
  return null;
}

function safeParseJson(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

// --- HTML entity decoding ---

function decodeHtml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .replaceAll("&amp;", "&");
}

// --- Byte formatting ---

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${Number(value.toFixed(2))} ${units[i]}`;
}

// --- FE3 SOAP API ---

const FE3_URL =
  "https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx";
const FE3CR_URL =
  "https://fe3cr.delivery.mp.microsoft.com/ClientWebService/client.asmx";

// Microsoft root CAs for FE3 delivery servers — these are NOT in Node.js's
// default (Mozilla NSS) CA bundle. The server may negotiate either an RSA or
// ECC certificate chain depending on client TLS capabilities, so both roots
// are required.
// RSA chain: *.delivery.mp → Microsoft Update Secure Server CA 2.1 → this root
const MS_ROOT_CA_2011_PEM = `-----BEGIN CERTIFICATE-----
MIIF7TCCA9WgAwIBAgIQP4vItfyfspZDtWnWbELhRDANBgkqhkiG9w0BAQsFADCB
iDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1Jl
ZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEyMDAGA1UEAxMp
TWljcm9zb2Z0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5IDIwMTEwHhcNMTEw
MzIyMjIwNTI4WhcNMzYwMzIyMjIxMzA0WjCBiDELMAkGA1UEBhMCVVMxEzARBgNV
BAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
c29mdCBDb3Jwb3JhdGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2VydGlm
aWNhdGUgQXV0aG9yaXR5IDIwMTEwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIK
AoICAQCygEGqNThNE3IyaCJNuLLx/9VSvGzH9dJKjDbu0cJcfoyKrq8TKG/Ac+M6
ztAlqFo6be+ouFmrEyNozQwph9FvgFyPRH9dkAFSWKxRxV8qh9zc2AodwQO5e7BW
6KPeZGHCnvjzfLnsDbVU/ky2ZU+I8JxImQxCCwl8MVkXeQZ4KI2JOkwDJb5xalwL
54RgpJki49KvhKSn+9GY7Qyp3pSJ4Q6g3MDOmT3qCFK7VnnkH4S6Hri0xElcTzFL
h93dBWcmmYDgcRGjuKVB4qRTufcyKYMME782XgSzS0NHL2vikR7TmE/dQgfI6B0S
/Jmpaz6SfsjWaTr8ZL22CZ3K/QwLopt3YEsDlKQwaRLWQi3BQUzK3Kr9j1uDRprZ
/LHR47PJf0h6zSTwQY9cdNCssBAgBkm3xy0hyFfj0IbzA2j70M5xwYmZSmQBbP3s
MJHPQTySx+W6hh1hhMdfgzlirrSSL0fzC/hV66AfWdC7dJse0Hbm8ukG1xDo+mTe
acY1logC8Ea4PyeZb8txiSk190gWAjWP1Xl8TQLPX+uKg09FcYj5qQ1OcunCnAfP
SRtOBA5jUYxe2ADBVSy2xuDCZU7JNDn1nLPEfuhhbhNfFcRf2X7tHc7uROzLLoax
7Dj2cO2rXBPB2Q8Nx4CyVe0096yb5MPa50c8prWPMd/FS6/r8QIDAQABo1EwTzAL
BgNVHQ8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUci06AjGQQ7kU
BU7h6qfHMdEjiTQwEAYJKwYBBAGCNxUBBAMCAQAwDQYJKoZIhvcNAQELBQADggIB
AH9yzw+3xRXbm8BJyiZb/p4T5tPw0tuXX/JLP02zrhmu7deXoKzvqTqjwkGw5biR
nhOBJAPmCf0/V0A5ISRW0RAvS0CpNoZLtFNXmvvxfomPEf4YbFGq6O0JlbXlccmh
6Yd1phV/yX43VF50k8XDZ8wNT2uoFwxtCJJ+i92Bqi1wIcM9BhS7vyRep4TXPw8h
Ir1LAAbblxzYXtTFC1yHblCk6MM4pPvLLMWSZpuFXst6bJN8gClYW1e1QGm6CHmm
ZGIVnYeWRbVmIyADixxzoNOieTPgUFmG2y/lAiXqcyqfABTINseSO+lOAOzYVgm5
M0kS0lQLAausR7aRKX1MtHWAUgHoyoL2n8ysnI8X6i8msKtyrAv+nlEex0NVZ09R
s1fWtuzuUrc66U7h14GIvE+OdbtLqPA1qibUZ2dJsnBMO5PcHd94kIZysjik0dyS
TclY6ysSXNQ7roxrsIPlAT/4CTL2kzU0Iq/dNw13CYArzUgA8YyZGUcFAenRv9FO
0OYoQzeZpApKCNmacXPSqs0xE2N2oTdvkjgefRI8ZjLny23h/FKJ3crWZgWalmG+
oijHHKOnNlA8OqTfSm7mhzvO6/DggTedEzxSjr25HTTGHdUKaj2YKXCMiSrRq4IQ
SB/c9O+lxbtVGjhjhE63bK2VVOxlIhBJF7jAHscPrFRH
-----END CERTIFICATE-----`;
// ECC chain: *.delivery.mp → Microsoft ECC Update Secure Server CA 2.1 → this root
const MS_ECC_ROOT_CA_2018_PEM = `-----BEGIN CERTIFICATE-----
MIIDIzCCAqigAwIBAgIQFJgmZtx8zY9AU2d7uZnshTAKBggqhkjOPQQDAzCBlDEL
MAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjE+MDwGA1UEAxM1TWlj
cm9zb2Z0IEVDQyBQcm9kdWN0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5IDIw
MTgwHhcNMTgwMjI3MjA0MjA4WhcNNDMwMjI3MjA1MDQ2WjCBlDELMAkGA1UEBhMC
VVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNV
BAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjE+MDwGA1UEAxM1TWljcm9zb2Z0IEVD
QyBQcm9kdWN0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5IDIwMTgwdjAQBgcq
hkjOPQIBBgUrgQQAIgNiAATHERYqdh1Wjr65YmXUw8608MMw7I9t1245vMhJq6u4
40N41YEGXe/HfZ/O1rOQdd4MsJDeI7rI0T5n4BmpG4YxHl80Le4X/RX7fieKMqHq
yY/JfhjLLzssSHp9pvQBB6yjgbwwgbkwDgYDVR0PAQH/BAQDAgGGMA8GA1UdEwEB
/wQFMAMBAf8wHQYDVR0OBBYEFEPvcIe4nb/siBncxsRrdQ11NDMIMBAGCSsGAQQB
gjcVAQQDAgEAMGUGA1UdIAReMFwwBgYEVR0gADBSBgwrBgEEAYI3TIN9AQEwQjBA
BggrBgEFBQcCARY0aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9Eb2Nz
L1JlcG9zaXRvcnkuaHRtADAKBggqhkjOPQQDAwNpADBmAjEAocBJRF0yVSfMPpBu
JSKdJFubUTXHkUlJKqP5b08czd2c4bVXyZ7CIkWbBhVwHEW/AjEAxdMo63LHPrCs
Jwl/Yj1geeWS8UUquaUC5GC7/nornGCntZkU8rC+8LsFllZWj8Fo
-----END CERTIFICATE-----`;

const fe3HttpsAgent = new https.Agent({
  ca: MS_ROOT_CA_2011_PEM + "\n" + MS_ECC_ROOT_CA_2018_PEM,
});

async function fe3PostSoap(url: string, xml: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname,
        method: "POST",
        agent: fe3HttpsAgent,
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "User-Agent": site.userAgent,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`FE3 API 请求失败: ${res.statusCode}`));
            return;
          }
          resolve(body);
        });
      },
    );
    req.on("error", reject);
    req.write(xml);
    req.end();
  });
}

// Step 1: GetCookie — obtain an EncryptedData cookie for subsequent calls
async function fe3GetCookie(): Promise<string> {
  const xml = `<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<Header>
    <a:Action mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetCookie</a:Action>
    <a:To mustUnderstand="1">${FE3CR_URL}</a:To>
    <Security mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <WindowsUpdateTicketsToken xmlns="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization" u:id="ClientMSA">
        </WindowsUpdateTicketsToken>
    </Security>
</Header>
<Body></Body>
</Envelope>`;

  const responseText = await fe3PostSoap(FE3CR_URL, xml);
  const match = responseText.match(
    /<EncryptedData>([\s\S]*?)<\/EncryptedData>/,
  );
  if (!match?.[1]) {
    throw new Error("无法获取 FE3 Cookie");
  }
  return match[1];
}

// Hardcoded update IDs required by the Windows Update SOAP protocol
const INSTALLED_NON_LEAF_UPDATE_IDS = [
  1, 2, 3, 11, 19, 544, 549, 2359974, 2359977, 5169044, 8788830, 23110993,
  23110994, 54341900, 54343656, 59830006, 59830007, 59830008, 60484010,
  62450018, 62450019, 62450020, 66027979, 66053150, 97657898, 98822896,
  98959022, 98959023, 98959024, 98959025, 98959026, 104433538, 104900364,
  105489019, 117765322, 129905029, 130040031, 132387090, 132393049, 133399034,
  138537048, 140377312, 143747671, 158941041, 158941042, 158941043, 158941044,
  159123858, 159130928, 164836897, 164847386, 164848327, 164852241, 164852246,
  164852252, 164852253,
];

const OTHER_CACHED_UPDATE_IDS = [
  10, 17, 2359977, 5143990, 5169043, 5169047, 8806526, 9125350, 9154769,
  10809856, 23110995, 23110996, 23110999, 23111000, 23111001, 23111002,
  23111003, 23111004, 24513870, 28880263,
];

function buildSyncUpdatesXml(
  cookie: string,
  categoryId: string,
  ring: StoreRing,
): string {
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60 * 1000);

  const installedIds = INSTALLED_NON_LEAF_UPDATE_IDS.map(
    (id) => `                <int>${id}</int>`,
  ).join("\n");

  const cachedIds = OTHER_CACHED_UPDATE_IDS.map(
    (id) => `                <int>${id}</int>`,
  ).join("\n");

  return `<s:Envelope xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:s="http://www.w3.org/2003/05/soap-envelope">
<s:Header>
    <a:Action s:mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/SyncUpdates</a:Action>
    <a:MessageID>urn:uuid:${crypto.randomUUID()}</a:MessageID>
    <a:To s:mustUnderstand="1">${FE3_URL}</a:To>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <Timestamp xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
            <Created>${now.toISOString()}</Created>
            <Expires>${expires.toISOString()}</Expires>
        </Timestamp>
        <wuws:WindowsUpdateTicketsToken wsu:id="ClientMSA" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:wuws="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization">
            <TicketType Name="MSA" Version="1.0" Policy="MBI_SSL">
                ${ring}
            </TicketType>
        </wuws:WindowsUpdateTicketsToken>
    </o:Security>
</s:Header>
<s:Body>
    <SyncUpdates xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
        <cookie>
            <Expiration>2045-03-11T02:02:48Z</Expiration>
            <EncryptedData>${cookie}</EncryptedData>
        </cookie>
        <parameters>
            <ExpressQuery>false</ExpressQuery>
            <InstalledNonLeafUpdateIDs>
${installedIds}
            </InstalledNonLeafUpdateIDs>
            <OtherCachedUpdateIDs>
${cachedIds}
            </OtherCachedUpdateIDs>
            <SkipSoftwareSync>false</SkipSoftwareSync>
            <NeedTwoGroupOutOfScopeUpdates>true</NeedTwoGroupOutOfScopeUpdates>
            <FilterAppCategoryIds>
                <CategoryIdentifier>
                    <Id>${categoryId}</Id>
                </CategoryIdentifier>
            </FilterAppCategoryIds>
            <TreatAppCategoryIdsAsInstalled>true</TreatAppCategoryIdsAsInstalled>
            <AlsoPerformRegularSync>false</AlsoPerformRegularSync>
            <ComputerSpec />
            <ExtendedUpdateInfoParameters>
                <XmlUpdateFragmentTypes>
                    <XmlUpdateFragmentType>Extended</XmlUpdateFragmentType>
                </XmlUpdateFragmentTypes>
                <Locales>
                    <string>en-US</string>
                    <string>en</string>
                </Locales>
            </ExtendedUpdateInfoParameters>
            <ClientPreferredLanguages>
                <string>en-US</string>
            </ClientPreferredLanguages>
            <ProductsParameters>
                <SyncCurrentVersionOnly>false</SyncCurrentVersionOnly>
                <DeviceAttributes>BranchReadinessLevel=CB;CurrentBranch=rs_prerelease;FlightRing=${ring};FlightingBranchName=external;IsFlightingEnabled=1;InstallLanguage=en-US;OSUILocale=en-US;InstallationType=Client;DeviceFamily=Windows.Desktop;</DeviceAttributes>
                <CallerAttributes>Interactive=1;IsSeeker=0;</CallerAttributes>
                <Products />
            </ProductsParameters>
        </parameters>
    </SyncUpdates>
</s:Body>
</s:Envelope>`;
}

interface Fe3PackageInfo {
  fileName: string;
  size: number;
  sha1: string;
  updateId: string;
  revisionNumber: string;
}

// Parse the SyncUpdates SOAP response to extract file metadata and update
// identities.  The response contains <UpdateInfo> blocks, each with an <ID>
// and an HTML-encoded <Xml> blob.  After entity-decoding, some blocks carry
// <File> elements (package info) while others carry <UpdateIdentity> +
// <SecuredFragment> (downloadable update identity).  Blocks that share the
// same <ID> belong to the same logical update.
function parseSyncUpdatesResponse(responseText: string): Fe3PackageInfo[] {
  const decoded = decodeHtml(responseText);

  // The SyncUpdates response has two sections sharing the same numeric IDs:
  //   <NewUpdates> → <UpdateInfo> blocks: contain <SecuredFragment> + <UpdateIdentity>
  //   <ExtendedUpdateInfo> → <Update> blocks: contain <Files> → <File> elements

  // Pass 1: Parse <Update> blocks for file metadata
  const filesById = new Map<
    string,
    { fileName: string; size: number; sha1: string }
  >();
  const updateBlockRegex = /<Update>([\s\S]*?)<\/Update>/gi;
  let m: RegExpExecArray | null;
  while ((m = updateBlockRegex.exec(decoded)) !== null) {
    const block = m[1];
    const idMatch = block.match(/<ID>(\d+)<\/ID>/);
    if (!idMatch) continue;
    const id = idMatch[1];

    // Pick the first <File> with InstallerSpecificIdentifier (skip blockmap /
    // metadata files that lack this attribute).
    const fileMatch = block.match(
      /<File\s+([^>]*InstallerSpecificIdentifier="[^"]*"[^>]*)(?:\/\s*>|>)/i,
    );
    if (!fileMatch) continue;

    const attrs = fileMatch[1];
    const fileName = attrs.match(/FileName="([^"]*)"/)?.[1];
    const installerSpecificId = attrs.match(
      /InstallerSpecificIdentifier="([^"]*)"/,
    )?.[1];
    if (!fileName || !installerSpecificId) continue;

    const ext = fileName.match(/(\.[^.]+)$/)?.[1] ?? "";
    const sizeStr = attrs.match(/Size="([^"]*)"/)?.[1];
    const digest = attrs.match(/Digest="([^"]*)"/)?.[1];

    filesById.set(id, {
      fileName: `${installerSpecificId}${ext}`,
      size: sizeStr ? parseInt(sizeStr, 10) : 0,
      sha1: digest ?? "",
    });
  }

  // Pass 2: Parse <UpdateInfo> blocks for downloadable update identities
  const updatesById = new Map<
    string,
    { updateId: string; revisionNumber: string }
  >();
  const infoBlockRegex = /<UpdateInfo>([\s\S]*?)<\/UpdateInfo>/gi;
  while ((m = infoBlockRegex.exec(decoded)) !== null) {
    const block = m[1];
    const idMatch = block.match(/<ID>(\d+)<\/ID>/);
    if (!idMatch) continue;
    const id = idMatch[1];

    // <SecuredFragment> indicates a downloadable update
    if (!/<SecuredFragment[\s>]/i.test(block)) continue;

    const updateIdMatch = block.match(/UpdateID="([0-9a-f-]{36})"/i);
    const revMatch = block.match(/RevisionNumber="(\d+)"/i);
    if (updateIdMatch && revMatch) {
      updatesById.set(id, {
        updateId: updateIdMatch[1],
        revisionNumber: revMatch[1],
      });
    }
  }

  // Merge by shared ID
  const packages: Fe3PackageInfo[] = [];
  for (const [id, fileInfo] of filesById) {
    const update = updatesById.get(id);
    if (update) {
      packages.push({ ...fileInfo, ...update });
    }
  }

  return packages;
}

// Step 2: SyncUpdates — get file list and update identities for a given WuCategoryId
async function fe3SyncUpdates(
  cookie: string,
  categoryId: string,
  ring: StoreRing,
): Promise<Fe3PackageInfo[]> {
  const xml = buildSyncUpdatesXml(cookie, categoryId, ring);
  const responseText = await fe3PostSoap(FE3_URL, xml);
  return parseSyncUpdatesResponse(responseText);
}

// Step 3: GetExtendedUpdateInfo2 — resolve a single update identity into a CDN download URL
async function fe3GetFileUrl(
  updateId: string,
  revisionNumber: string,
): Promise<string | null> {
  const xml = `<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<Header>
<a:Action mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetExtendedUpdateInfo2</a:Action>
<a:To mustUnderstand="1">${FE3CR_URL}/secured</a:To>
<Security mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
    <WindowsUpdateTicketsToken xmlns="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization" u:id="ClientMSA">
    </WindowsUpdateTicketsToken>
</Security>
</Header>
<Body>
<GetExtendedUpdateInfo2 xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
    <updateIDs>
        <UpdateIdentity>
            <UpdateID>${updateId}</UpdateID>
            <RevisionNumber>${revisionNumber}</RevisionNumber>
        </UpdateIdentity>
    </updateIDs>
    <infoTypes>
        <XmlUpdateFragmentType>FileUrl</XmlUpdateFragmentType>
        <XmlUpdateFragmentType>FileDecryption</XmlUpdateFragmentType>
    </infoTypes>
    <deviceAttributes>FlightRing=Retail;</deviceAttributes>
</GetExtendedUpdateInfo2>
</Body>
</Envelope>`;

  const responseText = await fe3PostSoap(`${FE3CR_URL}/secured`, xml);

  const locationRegex = /<FileLocation>([\s\S]*?)<\/FileLocation>/gi;
  let match: RegExpExecArray | null;
  while ((match = locationRegex.exec(responseText)) !== null) {
    const content = match[1];
    const urlMatch = content.match(/<Url>([\s\S]*?)<\/Url>/);
    if (!urlMatch?.[1]) continue;

    const url = urlMatch[1].trim();
    // Skip blockmap placeholder URLs (exactly 99 characters long)
    if (url.length === 99) continue;

    // FE3 may return http:// URLs; Microsoft CDN supports HTTPS on the same paths
    return normalizeMSStoreDownloadUrl(url);
  }

  return null;
}

function extractUrlExpiry(url: string): string {
  try {
    const parsed = new URL(url);
    const p1 = parsed.searchParams.get("P1");
    if (p1) {
      const timestamp = parseInt(p1, 10);
      return new Date(timestamp * 1000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d{3}Z$/, " UTC");
    }
  } catch {
    // URL parsing failed — no expiry to extract
  }
  return "";
}

interface Fe3DownloadFile {
  name: string;
  url: string;
  expires: string;
  sha1: string;
  size: string;
}

async function fetchFe3Files(
  categoryId: string,
  ring: StoreRing,
): Promise<Fe3DownloadFile[]> {
  const cookie = await fe3GetCookie();
  const packages = await fe3SyncUpdates(cookie, categoryId, ring);

  if (packages.length === 0) {
    throw new Error("未找到可下载的文件");
  }

  // Resolve download URLs for all packages in parallel
  const urlResults = await Promise.all(
    packages.map(async (pkg) => {
      const url = await fe3GetFileUrl(pkg.updateId, pkg.revisionNumber);
      return { pkg, url };
    }),
  );

  const files: Fe3DownloadFile[] = [];
  for (const { pkg, url } of urlResults) {
    if (!url) continue;

    // Convert base64 SHA1 hash to hex for display
    let sha1Hex = pkg.sha1;
    if (pkg.sha1) {
      try {
        sha1Hex = Buffer.from(pkg.sha1, "base64").toString("hex");
      } catch {
        // Keep the original value if base64 decode fails
      }
    }

    files.push({
      name: pkg.fileName,
      url,
      expires: extractUrlExpiry(url),
      sha1: sha1Hex,
      size: formatBytes(pkg.size),
    });
  }

  return files;
}

// --- Main handler ---

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") ?? "url") as RequestType;
    const query = searchParams.get("query") ?? "";
    // Default to US / en-us: the global catalog has the widest coverage and
    // avoids empty results for apps that are not published in the CN market.
    const market = (searchParams.get("market") ?? "US").toUpperCase();
    const language = (searchParams.get("language") ?? "en-us").toLowerCase();
    const ring = (searchParams.get("ring") ?? "RP") as StoreRing;

    if (!/^[A-Z]{2}$/.test(market)) {
      return NextResponse.json({ error: "无效市场代码" }, { status: 400 });
    }
    if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(language)) {
      return NextResponse.json({ error: "无效语言代码" }, { status: 400 });
    }
    if (!["WIF", "WIS", "RP", "Retail"].includes(ring)) {
      return NextResponse.json({ error: "无效 ring 参数" }, { status: 400 });
    }

    const storeIdentifier = normalizeStoreIdentifier(type, query);

    // Fetch DisplayCatalog product metadata
    let product: Record<string, unknown> | undefined;
    const bigId = extractDisplayCatalogBigId(type, storeIdentifier);
    if (bigId) {
      const upstreamUrl =
        `https://displaycatalog.mp.microsoft.com/v7.0/products` +
        `?bigIds=${encodeURIComponent(bigId)}` +
        `&market=${encodeURIComponent(market)}` +
        `&languages=${encodeURIComponent(language)}`;

      const upstream = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": site.userAgent,
          "Accept-Language": `${language},en-us;q=0.8`,
        },
        cache: "no-store",
      });

      if (upstream.ok) {
        const data = (await upstream.json()) as {
          Products?: Array<Record<string, unknown>>;
        };
        product = data.Products?.[0];
      }
    }

    // Extract WuCategoryId from the first SKU that has FulfillmentData
    const displaySkuAvailabilities = (
      (product?.DisplaySkuAvailabilities ?? []) as Array<
        Record<string, unknown>
      >
    );
    let wuCategoryId: string | undefined;

    for (const entry of displaySkuAvailabilities) {
      const sku = (entry.Sku ?? {}) as Record<string, unknown>;
      const properties = (sku.Properties ?? {}) as Record<string, unknown>;
      const fulfillment = safeParseJson(properties.FulfillmentData);
      if (fulfillment && typeof fulfillment.WuCategoryId === "string") {
        wuCategoryId = fulfillment.WuCategoryId;
        break;
      }
    }

    // Fetch files via Microsoft FE3 Delivery SOAP API
    let files: Fe3DownloadFile[] | undefined;
    let filesError: string | undefined;

    if (wuCategoryId) {
      try {
        files = await fetchFe3Files(wuCategoryId, ring);
      } catch (error) {
        filesError = error instanceof Error ? error.message : String(error);
      }
    } else if (product) {
      filesError = "该应用不支持离线下载";
    }

    if (!product && !files?.length) {
      return NextResponse.json(
        { error: filesError || "未找到对应产品，请检查 ProductId 或链接" },
        { status: 404 },
      );
    }

    const localizedList = ((product?.LocalizedProperties ?? []) as Array<
      Record<string, unknown>
    >) ?? [];
    const productProperties = ((product?.Properties ?? {}) as Record<
      string,
      unknown
    >) ?? {};
    const localized =
      localizedList.find((item) => {
        const lang = String(item.Language ?? "").toLowerCase();
        return lang === language;
      }) ?? localizedList[0] ?? {};

    const skus = displaySkuAvailabilities.map((entry) => {
      const sku = (entry.Sku ?? {}) as Record<string, unknown>;
      const properties = (sku.Properties ?? {}) as Record<string, unknown>;
      const availability = ((entry.Availabilities ?? []) as Array<Record<
        string,
        unknown
      >>)[0];

      const packages = ((properties.Packages ?? []) as Array<
        Record<string, unknown>
      >).map((pkg) => ({
        packageFullName: String(pkg.PackageFullName ?? ""),
        packageId: String(pkg.PackageId ?? ""),
        packageFamilyName: String(pkg.PackageFamilyName ?? ""),
        packageFormat: String(pkg.PackageFormat ?? ""),
        version: String(pkg.Version ?? ""),
        architectures: Array.isArray(pkg.Architectures)
          ? pkg.Architectures.map((a) => String(a))
          : [],
        maxDownloadSizeInBytes: Number(pkg.MaxDownloadSizeInBytes ?? 0),
        maxInstallSizeInBytes: Number(pkg.MaxInstallSizeInBytes ?? 0),
        hash: String(pkg.Hash ?? ""),
        contentId: String(pkg.ContentId ?? ""),
        packageUri: String(pkg.PackageUri ?? ""),
        packageDownloadUris: Array.isArray(pkg.PackageDownloadUris)
          ? pkg.PackageDownloadUris.map((u) => String(u))
          : null,
      }));

      const fulfillment = safeParseJson(properties.FulfillmentData);

      return {
        skuId: String(sku.SkuId ?? ""),
        skuType: String(sku.SkuType ?? ""),
        actions: Array.isArray(availability?.Actions)
          ? availability.Actions.map((a) => String(a))
          : [],
        availabilityId: String(availability?.AvailabilityId ?? ""),
        fulfillmentData: fulfillment
          ? {
              productId:
                typeof fulfillment.ProductId === "string"
                  ? fulfillment.ProductId
                  : undefined,
              wuBundleId:
                typeof fulfillment.WuBundleId === "string"
                  ? fulfillment.WuBundleId
                  : undefined,
              wuCategoryId:
                typeof fulfillment.WuCategoryId === "string"
                  ? fulfillment.WuCategoryId
                  : undefined,
              packageFamilyName:
                typeof fulfillment.PackageFamilyName === "string"
                  ? fulfillment.PackageFamilyName
                  : undefined,
              skuId:
                typeof fulfillment.SkuId === "string"
                  ? fulfillment.SkuId
                  : undefined,
            }
          : undefined,
        packages,
      };
    });

    return NextResponse.json({
      productId: String(product?.ProductId ?? extractStoreIdentifierFromUrl(storeIdentifier) ?? storeIdentifier),
      title: String(localized.ProductTitle ?? ""),
      publisherName: String(localized.PublisherName ?? ""),
      description: String(localized.ProductDescription ?? ""),
      packageFamilyNames: Array.isArray(productProperties.PackageFamilyNames)
        ? (productProperties.PackageFamilyNames as Array<unknown>).map((p) =>
            String(p),
          )
        : [],
      market,
      language,
      files,
      filesError,
      skus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `解析失败: ${message}` }, { status: 500 });
  }
}
