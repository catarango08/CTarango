import { ToolboxApp } from './toolbox-app';

export const metadata = { title: 'Toolbox' };

/** Static on purpose: all data is bundled so it works with no signal. */
export default function ToolboxPage() {
  return <ToolboxApp />;
}
