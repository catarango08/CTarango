const L = (hex) => {
  const c = hex.replace('#','');
  const [r,g,b] = [0,2,4].map(i => parseInt(c.slice(i,i+2),16)/255)
    .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*r + 0.7152*g + 0.0722*b;
};
const ratio = (a,b) => { const [x,y] = [L(a),L(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
const check = (label, fg, bg, need=4.5) => {
  const r = ratio(fg,bg);
  console.log(`${r >= need ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  ${label}  ${fg} on ${bg}  (need ${need})`);
  return r >= need;
};
console.log('--- DAY (paper) ---');
check('ink on bg',            '#222426','#F5F1E8');
check('muted on bg',          '#63615B','#F5F1E8');
check('accent-ink on bg',     '#7A570F','#F5F1E8');
check('gold as text on bg',   '#B8871F','#F5F1E8');   // expected FAIL — decorative only
check('hazard on bg',         '#8E382F','#F5F1E8');
check('go on bg',             '#3F6B4A','#F5F1E8');
check('ink on surface-2',     '#222426','#EDE7DA');
check('on-accent on accent',  '#222426','#B8871F');
console.log('--- NIGHT (truck) ---');
check('ink on bg',            '#F5F1E8','#17191A');
check('muted on bg',          '#9A968C','#17191A');
check('accent-ink on surface','#E3BC6B','#222426');
check('accent on surface',    '#D9A441','#222426');
check('hazard C9614F',        '#C9614F','#222426');
check('hazard D98A7C',        '#D98A7C','#222426');
check('hazard E08C7C',        '#E08C7C','#222426');
check('go 7FB08C',            '#7FB08C','#222426');
check('ink on surface',       '#F5F1E8','#222426');
