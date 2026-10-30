const files = import.meta.glob('../assets/*.png', { eager: true, query: '?url', import: 'default' });
const asset = name => files[`../assets/${name}`];
export const cover = asset('capa_puck_rivals.png');
const striker = theme => asset(`rebatedor_hockey_${theme}.png`);
export const themes = {
  wood: { name: 'Oriental Wood', title: 'O templo dos rivais', caption: 'Madeira entalhada. Honra em cada jogada.', table: asset('Oriental_wood_mesa.png'), paddle: asset('raquete_Oriental_wood.png'), striker: striker('wood'), ball: asset('bolinha_Oriental_wood.png'), colors: [0x63d9ff, 0xffbd63], line: 0xffdb91, bounds: { left: 100, right: 900, top: 96, bottom: 456 } },
  cartoon: { name: 'Cartoon Fun', title: 'Uma aventura na mesa', caption: 'Cores, diversão e uma boa dose de rivalidade.', table: asset('Cartoon_Fun_mesa.png'), paddle: asset('raquete_Cartoon_Fun.png'), striker: striker('cartoon'), ball: asset('bolinha_Cartoon_Fun.png'), colors: [0x53d8ff, 0xff6b62], line: 0xffefb6, bounds: { left: 158, right: 842, top: 131, bottom: 413 } },
  neon: { name: 'Cyberpunk Neon', title: 'Domine a noite', caption: 'Ciano contra magenta. A arena está acesa.', table: asset('Cyberpunk_Neon_mesa.png'), paddle: asset('Paddle Cyberpunk Neon Futurista.png'), striker: striker('neon'), ball: asset('bolinha_Cyberpunk_Neon.png'), colors: [0x39e2ff, 0xff4bbe], line: 0x9bddff, bounds: { left: 160, right: 840, top: 131, bottom: 413 } },
};
for (const [id, theme] of Object.entries(themes)) {
  theme.surface = asset(`campo_${id}_v2.png`);
  theme.environment = asset(`cenario_${id}_v1.png`);
  theme.rope = asset('corda_sling_v2.png');
  // As mesas anteriores ficam apenas nas miniaturas decorativas do menu.
  delete theme.bounds;
}
export const modes = {
  pong: { name: 'Classic Pong', tag: 'REFLEXO & PRECISÃO', description: 'Movimente a raquete pela sua metade e encontre o melhor ângulo para rebater.', rule: 'Marque pontos fazendo a bola passar pela extremidade adversária.', icon: '↔' },
  hockey: { name: 'Air Hockey', tag: 'VELOCIDADE & IMPACTO', description: 'Deslize, ataque e defenda. Cada impacto pode decidir a partida.', rule: 'Acerte o gol iluminado no centro da borda adversária.', icon: '◎' },
  sling: { name: 'Sling Puck', tag: 'MIRA & TENSÃO', description: 'Puxe o disco, mire na abertura e solte. Esvazie seu lado antes do rival.', rule: 'Coloque os dez discos no campo adversário. A última passagem completa encerra a partida.', icon: '»' },
};
