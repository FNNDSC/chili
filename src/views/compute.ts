/**
 * @file View layer for compute resource commands.
 *
 * @module
 */
import { ComputeResource } from '@fnndsc/cumin';
import chalk from 'chalk';

/**
 * Renders a list of compute resources.
 *
 * @param resources - Array of ComputeResource objects.
 * @param options - Output options (table, csv).
 * @returns Formatted string.
 */
export function computeList_render(
  resources: ComputeResource[],
  options: { table?: boolean; csv?: boolean } = {}
): string {
  if (resources.length === 0) return chalk.gray('No compute resources found.');

  const fields: Array<keyof ComputeResource> = ['id', 'name', 'compute_url', 'description'];
  const headers = ['ID', 'NAME', 'URL', 'DESCRIPTION'];

  if (options.csv) {
    const lines: string[] = [headers.map((h: string) => `"${h}"`).join(',')];
    for (const r of resources) {
      lines.push(fields.map((f: keyof ComputeResource) => `"${r[f] ?? ''}"`).join(','));
    }
    return lines.join('\n');
  }

  if (options.table) {
    const colWidths: number[] = fields.map((f: keyof ComputeResource, i: number) =>
      Math.max(headers[i].length, ...resources.map((r: ComputeResource) => String(r[f] ?? '').length))
    );
    const header: string = headers.map((h: string, i: number) => h.padEnd(colWidths[i])).join('  ');
    const divider: string = colWidths.map((w: number) => '─'.repeat(w)).join('  ');
    const rows: string[] = resources.map((r: ComputeResource) =>
      fields.map((f: keyof ComputeResource, i: number) => String(r[f] ?? '').padEnd(colWidths[i])).join('  ')
    );
    return [chalk.bold(header), chalk.gray(divider), ...rows].join('\n');
  }

  const termWidth: number = process.stdout.columns || 120;
  const urlWidth = 40;
  const nameWidth = 20;
  const lines: string[] = [];

  for (const r of resources) {
    const id: string = chalk.bold.gray(String(r.id).padStart(4));
    const name: string = chalk.cyan(String(r.name).padEnd(nameWidth));
    const url: string = chalk.blue(String(r.compute_url ?? '').substring(0, urlWidth).padEnd(urlWidth));
    const desc: string = chalk.gray(String(r.description ?? '').substring(0, termWidth - nameWidth - urlWidth - 12));
    lines.push(`${id}  ${name}  ${url}  ${desc}`);
  }
  return lines.join('\n');
}
