/* demo: stand-ins for the modules of the full version that the demo leaves out (Excel import, style editor) */
const IMP = { parse() { throw new Error('demo'); }, apply() { }, classify() { return null; }, kindOf() { return ''; }, num(v) { return v; } };
function openStyleEditor() { toast(Access.why('org.profile')); }
