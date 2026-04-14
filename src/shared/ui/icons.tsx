import Image from "next/image";

type IconProps = {
  className?: string;
};

function LogoIcon({
  className,
  src,
}: IconProps & {
  src: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      width={64}
      height={64}
      unoptimized
    />
  );
}

export function VSCodeIcon(props: IconProps) {
  return <LogoIcon {...props} src="/logos/vscode.svg" />;
}

export function ChromeIcon(props: IconProps) {
  return <LogoIcon {...props} src="/logos/chrome.svg" />;
}

export function EdgeIcon(props: IconProps) {
  return <LogoIcon {...props} src="/logos/edge.svg" />;
}

export function DockerIcon(props: IconProps) {
  return <LogoIcon {...props} src="/logos/docker.svg" />;
}

export function MicrosoftStoreIcon(props: IconProps) {
  return <LogoIcon {...props} src="/logos/microsoft.svg" />;
}
