/**
 * @file Pipeline run command — creates a workflow from a registered pipeline.
 * @module
 */

import {
  chrisContext,
  errorStack,
  Result,
  Err,
} from "@fnndsc/cumin";
import {
  pipeline_run as salsa_pipeline_run,
  WorkflowResult,
} from "@fnndsc/salsa";

/**
 * Runs a pipeline by name or ID, attaching it to the current plugin context node
 * or an explicitly supplied previous instance ID.
 *
 * @param nameOrId - Pipeline name or numeric ID.
 * @param options - Optional compute override and explicit previous instance ID.
 * @returns Result containing workflow ID and created plugin instance IDs.
 */
export async function pipeline_execute(
  nameOrId: string,
  options: { compute?: string; previousInstId?: number } = {}
): Promise<Result<WorkflowResult>> {
  let previousInstId: number;

  if (options.previousInstId !== undefined) {
    previousInstId = options.previousInstId;
  } else {
    const contextInstStr: string | null = await chrisContext.ChRISplugin_get();
    if (!contextInstStr) {
      errorStack.stack_push(
        'error',
        'No plugin instance in context. Navigate to a feed node first, or supply --previous <id>.'
      );
      return Err();
    }
    previousInstId = parseInt(contextInstStr, 10);
    if (isNaN(previousInstId)) {
      errorStack.stack_push('error', `Invalid plugin instance in context: '${contextInstStr}'`);
      return Err();
    }
  }

  return salsa_pipeline_run(nameOrId, previousInstId, options.compute);
}
