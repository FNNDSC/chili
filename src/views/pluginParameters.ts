import chalk from 'chalk';
import { FilteredResourceData } from '@fnndsc/cumin';

/**
 * Renders plugin parameters in a "man page" style format.
 * 
 * Format:
 * [long parameter] [short parameter -- only if different] <value> (default: <default value>) 
 * Type: <type>
 * [help description]
 *
 * @param data - The filtered resource data containing plugin parameters.
 */
export function pluginParameters_renderMan(data: FilteredResourceData): void {
  if (!data.tableData || data.tableData.length === 0) {
    console.log("No parameters found.");
    return;
  }

  data.tableData.forEach((param: any) => {
    // 1. Construct the first line: Flags and Value
    let line1Parts: string[] = [];

    // Long flag: Display only if name length > 1
    if (param.name && param.name.length > 1) {
      line1Parts.push(chalk.bold(`--${param.name}`));
    }

    // Short flag: Display only if it exists and is a single character (excluding dashes)
    // Note: 'param.flag' usually comes with dashes (e.g. '-v').
    if (param.flag) {
      const cleanFlag = param.flag.replace(/^-+/, '');
      if (cleanFlag.length === 1) {
        // Avoid duplicating if it somehow matches the long flag visual (unlikely given logic)
        // The prompt says "only if different to long parameter".
        // Since long parameter is always --name (length > 1) and this is -f (length 1),
        // they are visually different.
        line1Parts.push(chalk.bold(param.flag));
      }
    }

    // Value placeholder
    if (param.action === 'store_true' || param.action === 'store_false') {
      // Boolean flags usually don't take a value in the signature invocation
    } else {
      // Generic value placeholder based on type
      const valueType = param.type ? `<${param.type}>` : '<value>';
      line1Parts.push(chalk.cyan(valueType));
    }

    // Default value
    if (param.default !== undefined && param.default !== null && param.default !== "") {
      line1Parts.push(chalk.gray(`(default: ${param.default})`));
    }
    
    if (line1Parts.length > 0) {
      console.log(line1Parts.join(' '));
    } else {
      // Fallback if both are suppressed (e.g. name 'v', no flag)?
      // In strict adherence, we show nothing on line 1, which is weird.
      // But assuming a valid plugin definition, one of them should appear.
      // If name is 'v', it implies it should probably have a flag '-v'.
      // If not, we might want to show '--v' anyway despite the rule, or '-v'.
      // For safety, if line1 is empty but we have a name, show it as long flag to avoid invisible params.
      if (param.name) {
         console.log(chalk.bold(`--${param.name}`) + ' ' + chalk.gray('(implicit)')); 
      }
    }

    // 2. Type line
    if (param.type) {
      console.log(`Type: ${chalk.yellow(param.type)}`);
    }

    // 3. Help description
    if (param.help) {
      console.log(chalk.white(param.help));
    }

    // Separator (newline)
    console.log('');
  });
}
