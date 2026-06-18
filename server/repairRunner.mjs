import { buildCompatibilityReport } from './compatibilityReport.mjs'
import { runCatalogCommand } from './commandCatalog.mjs'
import { recordFixture } from './fixtureRecorder.mjs'
import { readOpenClawSources } from './openclawSources.mjs'

export async function runRepairLoop({ recipeId, confirm, dryRun = false, paths, env, fixtureDir }) {
  if (confirm !== 'REPAIR') throw new Error('Type REPAIR to run a reviewed repair loop.')

  const beforeSources = await readOpenClawSources({ env, fixtureDir, paths })
  const before = await buildCompatibilityReport({ sources: beforeSources, paths, env, fixtureDir })
  const recipe = before.repairRecipes.find((item) => item.id === recipeId)
  if (!recipe) throw new Error(`Repair recipe is not available in the current report: ${recipeId}`)
  if (!recipe.runnable) throw new Error(`Repair recipe is not runnable yet: ${recipe.title}`)

  const action = await runRepairAction({ recipe, beforeSources, dryRun, paths, env })
  const afterSources = await readOpenClawSources({ env, fixtureDir, paths })
  const after = await buildCompatibilityReport({ sources: afterSources, paths, env, fixtureDir })
  const afterRecipe = after.repairRecipes.find((item) => item.id === recipeId)
  const cleared = !afterRecipe || afterRecipe.state === 'healthy'

  return {
    ok: action.ok,
    recipeId,
    title: recipe.title,
    dryRun: Boolean(action.dryRun),
    action,
    before: summarizeReport(before),
    after: summarizeReport(after),
    cleared,
    message: cleared
      ? 'Repair loop completed and the recipe no longer appears as an active issue.'
      : 'Repair loop completed, but Cockpit still sees this issue. Review the after-state before running another fix.',
    finishedAt: new Date().toISOString(),
  }
}

async function runRepairAction({ recipe, beforeSources, dryRun, paths, env }) {
  if (recipe.commandId) {
    return runCatalogCommand({
      commandId: recipe.commandId,
      params: {},
      confirm: 'RUN',
      paths,
      env,
      dryRun,
    })
  }

  if (recipe.endpoint === '/api/fixtures/record') {
    if (dryRun || env.COCKPIT_FIXTURE_DIR || env.COCKPIT_EXECUTION_MODE === 'dry-run') {
      return {
        ok: true,
        dryRun: true,
        stdout: 'Dry run: fixture recorder validated but did not write files.',
        stderr: '',
        finishedAt: new Date().toISOString(),
      }
    }
    const result = await recordFixture({ sources: beforeSources, paths, confirm: 'RECORD', env })
    return {
      ok: result.ok,
      dryRun: false,
      stdout: result.message,
      stderr: '',
      path: result.path,
      files: result.files,
      finishedAt: result.savedAt,
    }
  }

  throw new Error(`Repair recipe has no supported action: ${recipe.id}`)
}

function summarizeReport(report) {
  return {
    generatedAt: report.generatedAt,
    contract: report.contract.posture,
    compatibility: report.compatibility.posture,
    update: report.updateRadar.recommendation.state,
    recipes: report.repairRecipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      state: recipe.state,
      runnable: recipe.runnable,
    })),
    nextBestMove: report.nextBestMove,
  }
}
