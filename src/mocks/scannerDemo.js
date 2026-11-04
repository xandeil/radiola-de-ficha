/*
 * Códigos de barras de DEMONSTRAÇÃO (válidos, com dígito verificador certo,
 * mas inventados). Respondem sem internet, para você testar o scanner
 * mesmo offline. Qualquer outro código vai para o MusicBrainz de verdade.
 *
 * Dica: abra o scanner, digite 7891234567895 e veja duas edições aparecerem.
 */

export const edicoesDemo = {
  '7891234567895': [
    {
      id: 'demo-1',
      fonte: 'demonstração',
      titulo: 'Acabou Chorare',
      artista: 'Novos Baianos',
      ano: 1972,
      pais: 'Brasil',
      gravadora: 'Som Livre',
      numero_catalogo: 'SSIG-6006',
      formato: 'LP',
      descricao_formato: 'Vinyl, LP, Album',
      capa_imagem: null,
      cor_capa: '#c97b3a',
      faixas: [
        { numero: 1, lado: 'A', titulo: 'Brasil Pandeiro', duracao_segundos: 233 },
        { numero: 2, lado: 'A', titulo: 'Preta Pretinha', duracao_segundos: 402 },
        { numero: 3, lado: 'A', titulo: 'Tinindo Trincando', duracao_segundos: 205 },
        { numero: 4, lado: 'B', titulo: 'Acabou Chorare', duracao_segundos: 233 },
        { numero: 5, lado: 'B', titulo: 'Mistério do Planeta', duracao_segundos: 243 },
      ],
    },
    {
      id: 'demo-2',
      fonte: 'demonstração',
      titulo: 'Acabou Chorare',
      artista: 'Novos Baianos',
      ano: 2004,
      pais: 'Brasil',
      gravadora: 'Som Livre',
      numero_catalogo: '0340-2',
      formato: 'CD',
      descricao_formato: 'CD, Album, Reissue, Remastered',
      capa_imagem: null,
      cor_capa: '#b5651d',
      faixas: [
        { numero: 1, lado: null, titulo: 'Brasil Pandeiro', duracao_segundos: 233 },
        { numero: 2, lado: null, titulo: 'Preta Pretinha', duracao_segundos: 402 },
      ],
    },
  ],
  '4006381333931': [
    {
      id: 'demo-3',
      fonte: 'demonstração',
      titulo: 'Fita Mix Anos 80',
      artista: 'Vários Artistas',
      ano: 1986,
      pais: 'Brasil',
      gravadora: 'RCA',
      numero_catalogo: 'K7-1986',
      formato: 'K7',
      descricao_formato: 'Cassette, Compilation',
      capa_imagem: null,
      cor_capa: '#5c7a4f',
      faixas: [
        { numero: 1, lado: 'A', titulo: 'Faixa 1', duracao_segundos: 210 },
        { numero: 2, lado: 'B', titulo: 'Faixa 2', duracao_segundos: 200 },
      ],
    },
  ],
};
