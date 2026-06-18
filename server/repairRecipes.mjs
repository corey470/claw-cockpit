export function buildRepairRecipes({ compatibility, contract, updateRadar }) {
  const recipes = []

  if (updateRadar.updateAvailable) {
    recipes.push({
      id: 'review-openclaw-update',
      title: 'Review OpenClaw update before installing',
      state: 'attention',
      trigger: updateRadar.recommendation.detail,
      outcome: 'Shows what changed upstream or in the local update signal before OpenClaw is updated.',
      safeAction: 'Open Update Radar, run the contract report, record a fixture, then update from the terminal when ready.',
      runnable: false,
    })
  }

  const blockedContract = contract.checks.filter((check) => check.state === 'blocked')
  if (blockedContract.length > 0) {
    recipes.push({
      id: 'record-drift-fixture',
      title: 'Record current OpenClaw shape as a fixture',
      state: 'attention',
      trigger: `${blockedContract.length} contract check${blockedContract.length === 1 ? '' : 's'} blocked.`,
      outcome: 'Saves redacted current OpenClaw output so the adapter can be patched against real evidence.',
      safeAction: 'Use Record fixture after reviewing the contract failures.',
      runnable: true,
      endpoint: '/api/fixtures/record',
      confirm: 'RECORD',
    })
  }

  for (const check of [...compatibility.checks, ...contract.checks]) {
    if (check.id === 'gateway-contract' || check.id === 'gateway-probe') {
      if (check.state !== 'healthy') {
        recipes.push({
          id: 'repair-gateway',
          title: 'Repair or restart the local gateway',
          state: check.state,
          trigger: check.detail,
          outcome: 'Restores the local OpenClaw control surface before other setup work continues.',
          safeAction: 'Review the gateway restart command from Fix warnings.',
          runnable: true,
          commandId: 'gateway.restart',
        })
      }
    }

    if (check.id === 'security-posture' || check.id === 'security-summary') {
      if (check.state !== 'healthy') {
        recipes.push({
          id: 'refresh-security-audit',
          title: 'Run a deep security audit',
          state: check.state,
          trigger: check.detail,
          outcome: 'Refreshes security source truth after OpenClaw changes auth, exposure, or plugin behavior.',
          safeAction: 'Run the allowlisted deep audit command from the review drawer.',
          runnable: true,
          commandId: 'security.audit.deep',
        })
      }
    }

    if (check.id === 'cli-surface' || check.id === 'cli-core' || check.id === 'setup-command-surface') {
      if (check.state !== 'healthy') {
        recipes.push({
          id: 'remap-cli-surface',
          title: 'Remap changed OpenClaw commands',
          state: check.state,
          trigger: check.detail,
          outcome: 'Updates Cockpit command drafts after OpenClaw renames or moves a command.',
          safeAction: 'Compare upstream/fork help output, record a fixture, then patch commandCatalog and smoke tests.',
          runnable: false,
        })
      }
    }

    if (check.id === 'parser-shape' || check.id === 'status-shape') {
      if (check.state !== 'healthy') {
        recipes.push({
          id: 'teach-status-parser',
          title: 'Teach Cockpit the new status shape',
          state: check.state,
          trigger: check.detail,
          outcome: 'Keeps beginner UI copy accurate when OpenClaw changes status tables or labels.',
          safeAction: 'Record a fixture, update parser expectations, then run fixture smoke.',
          runnable: true,
          endpoint: '/api/fixtures/record',
          confirm: 'RECORD',
        })
      }
    }

    if (check.id === 'supply-chain' && check.state !== 'healthy') {
      recipes.push({
        id: 'pin-plugin-specs',
        title: 'Pin plugin install specs',
        state: check.state,
        trigger: check.detail,
        outcome: 'Reduces surprise when OpenClaw plugin packages update independently.',
        safeAction: 'Review plugin source and pin exact versions in OpenClaw config or plugin index.',
        runnable: false,
      })
    }
  }

  return dedupeRecipes(recipes).slice(0, 8)
}

function dedupeRecipes(recipes) {
  const seen = new Set()
  return recipes.filter((recipe) => {
    if (seen.has(recipe.id)) return false
    seen.add(recipe.id)
    return true
  })
}
