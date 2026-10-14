import { ComponentNamesProvider } from "@/components/parts-support/PartsSupportContext";
import { getComponentNames } from "@/lib/installed-base";

export default async function PartsSupportLayout({ children }: LayoutProps<"/parts-support">) {
  return <ComponentNamesProvider names={await getComponentNames()}>{children}</ComponentNamesProvider>;
}
