import { buildCompatibility } from './compatibilityScoring.mjs'
import { buildContractReport } from './contractTester.mjs'
import { textFrom } from './openclawParsers.mjs'
import { buildRepairRecipes } from './repairRecipes.mjs'
import { buildUpdateRadar } from './updateRadar.mjs'

export async function buildCompatibilityReport({ sources, paths, env, fixtureDir }) {
  const statusText = textFrom(sources.status)
  const probeText = textFrom(sources.probe)
  const compatibility = buildCompatibility({ sources, statusText, probeText, paths })
  const contract = buildContractReport({ sources, paths, statusText, probeText })
  const updateRadar = await buildUpdateRadar({ env, fixtureDir, statusText })
  const repairRecipes = buildRepairRecipes({ compatibility, contract, updateRadar })

  return {
    generatedAt: new Date().toISOString(),
    adapterContract: {
      schemaVersion: '2026-06-18.1',
      reportName: 'claw-cockpit-openclaw-compatibility',
    },
    updateRadar,
    contract,
    compatibility,
    repairRecipes,
    nextBestMove: chooseNextBestMove({ updateRadar, contract, compatibility, repairRecipes }),
  }
}

function chooseNextBestMove({ updateRadar, contract, compatibility, repairRecipes }) {
  if (contract.posture === 'blocked') {
    return {
      state: 'blocked',
      title: 'Record the breakage before changing setup',
      detail: 'A contract check is blocked. Save a redacted fixture, then patch the adapter against real output.',
    }
  }

  if (compatibility.posture === 'blocked') {
    return {
      state: 'blocked',
      title: 'Fix the blocking OpenClaw signal first',
      detail: compatibility.summary,
    }
  }

  if (updateRadar.updateAvailable) {
    return {
      state: 'attention',
      title: 'Review the OpenClaw update path',
      detail: 'OpenClaw appears to have an update available. Run the contract check before updating.',
    }
  }

  const runnable = repairRecipes.find((recipe) => recipe.runnable)
  if (runnable) {
    return {
      state: runnable.state,
      title: runnable.title,
      detail: runnable.safeAction,
    }
  }

  return {
    state: 'healthy',
    title: 'Keep using Cockpit normally',
    detail: 'No blocking update or contract drift is visible in the current report.',
  }
}
