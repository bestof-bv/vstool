/* Interface — English (source language of the interface keys) */
I18N.add({
  domain: 'ui', code: 'en', name: 'English', locale: 'en-GB', num: { group: ' ', dec: '.' },
  labels: {
    dir: { T: 'Supply', A: 'Extract' },
    kind: { terminal: 'Grille / diffuser', duct: 'Duct', device: 'Fire / shut-off damper (on the duct)' },
    ttype: { plafonddiffusor: 'Ceiling diffuser', rooster: 'Grille', ventiel: 'Disc valve', sleuf: 'Slot diffuser', wervel: 'Swirl diffuser', overig: 'Other' },
    method: { hood: 'Flow hood (balometer)', anemo: 'Anemometer × Aeff', kfactor: 'Δp × k-factor', pitot: 'Pitot tube traverse', traverse: 'Velocity traverse, m/s', readout: 'Controller reading' },
    reg: { none: 'None', iris: 'Iris damper', regelklep: 'Control damper', cav: 'CAV controller', vav: 'VAV controller', plenum: 'Plenum damper', afsluit: 'Shut-off damper', brand: 'Fire damper', terugslag: 'Non-return damper' },
    state: { '': '—', open: 'Open', dicht: 'Closed', ok: 'In order', defect: 'Defective' },
    role: { owner: 'Owner', admin: 'Administrator', lead: 'Project lead', tech: 'Technician', sub: 'Subcontractor', viewer: 'Viewer (client)' },
    plan: { local: 'Local (no account)', demo: 'Demo', trial: 'Trial', solo: 'Solo', team: 'Team', business: 'Business', expired: 'Ended' },
    cond: { '': '—', ok: 'In order', defect: 'Defective' },
    pass: { '': '—', wand: 'Wall', vloer: 'Floor slab', schacht: 'Shaft wall' },
    act: { '': '—', smelt: 'Fusible link 72 °C', m24: 'Motor 24 V', m230: 'Motor 230 V', other: 'Other' },
    chk: { '': '—', ok: 'OK', nok: 'Not OK', nvt: 'n/a' },
    shape: { round: 'Round', rect: 'Rectangular' },
    status: { '': 'Normal', noaccess: 'No access', missing: 'Missing', mismatch: 'Does not match the data' },
    phase: { eerste: 'Initial measurement', controle: 'Control measurement' },
    inskind: { hood: 'Flow hood', funnel: 'Funnel + vane anemometer', vane: 'Vane anemometer', hotwire: 'Hot-wire (thermal) anemometer', dp: 'Differential pressure meter (Pitot, k-factor)', clamp: 'Current clamp', tacho: 'Tachometer (rpm)', other: 'Other' },
  },
  strings: {
    "Package issued: {n} points": {
      "one": "Package issued: {n} point",
      "other": "Package issued: {n} points"
    },
    "{n} measuring points": {
      "one": "{n} measuring point",
      "other": "{n} measuring points"
    },
    "{n} open packages": {
      "one": "{n} open package",
      "other": "{n} open packages"
    },
    "{n} points": {
      "one": "{n} point",
      "other": "{n} points"
    },
    "{n} points behind": {
      "one": "{n} point behind",
      "other": "{n} points behind"
    },
    "{n} users": {
      "one": "{n} user",
      "other": "{n} users"
    }
  },
});
