/*
 * Catálogos de teste: 10 discos para cada conta de exemplo, espalhados em
 * 4 armários diferentes de cada casa (3 + 3 + 2 + 2 discos).
 *
 * Os discos, artistas, anos, gravadoras e faixas são reais. Já preço,
 * conservação, duração das faixas e lado do vinil são valores de exemplo.
 * Entram no banco pela migração v5 do mockDb.
 */

const ID_INICIAL = 1001;
const DISTRIBUICAO = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3]; // em qual armário fica cada disco
const ESTADOS = ['Ótimo', 'Bom', 'Bom', 'Regular', 'Ótimo'];
const PRECOS = [45, 80, 120, 65, 150, 95, 35, 210, 70, 110];

/** titulo, artista, tipo, ano, gênero, gravadora, país, cor da capa, faixas, subtipo */
const d = (titulo, artista, tipo_midia, ano_lancamento, genero, gravadora, pais_origem, cor_capa, faixas, subtipo) => ({
  titulo, artista, tipo_midia, ano_lancamento, genero, gravadora, pais_origem, cor_capa, faixas,
  subtipo: subtipo || (tipo_midia === 'LP' ? 'LP' : 'Álbum'),
});

const COLECOES = [
  {
    id_usuario: 1, // Colecionador Demo — clássicos da MPB
    armarios: [
      ['Sala de Estar', 'Armário de Imbuia'],
      ['Escritório', 'Armário 3'],
      ['Quarto', 'Armário Embutido'],
      ['Corredor', 'Armário de Vidro'],
    ],
    discos: [
      d('Construção', 'Chico Buarque', 'LP', 1971, 'MPB', 'Philips', 'Brasil', '#8c6b4f', ['Construção', 'Cotidiano', 'Deus Lhe Pague']),
      d('Transa', 'Caetano Veloso', 'LP', 1972, 'MPB', 'Philips', 'Brasil', '#c4553b', ["You Don't Know Me", 'Nine Out of Ten', "It's a Long Way"]),
      d('Expresso 2222', 'Gilberto Gil', 'LP', 1972, 'MPB', 'Philips', 'Brasil', '#3b7a57', ['Back in Bahia', 'Expresso 2222', 'Oriente']),
      d('Os Mutantes', 'Os Mutantes', 'LP', 1968, 'Tropicália', 'Polydor', 'Brasil', '#b8527a', ['Panis et Circenses', 'A Minha Menina', 'Baby']),
      d('A Tábua de Esmeralda', 'Jorge Ben', 'LP', 1974, 'Samba', 'Philips', 'Brasil', '#2e7d6b', ['Os Alquimistas Estão Chegando os Alquimistas', 'O Homem da Gravata Florida', 'Zumbi']),
      d('Cartola', 'Cartola', 'CD', 1976, 'Samba', 'Discos Marcus Pereira', 'Brasil', '#a3852c', ['As Rosas Não Falam', 'O Mundo É um Moinho', 'Preciso Me Encontrar']),
      d('Alucinação', 'Belchior', 'LP', 1976, 'MPB', 'Philips', 'Brasil', '#5a5a66', ['Apenas um Rapaz Latino-Americano', 'Como Nossos Pais', 'Velha Roupa Colorida']),
      d('Secos & Molhados', 'Secos & Molhados', 'CD', 1973, 'Rock', 'Continental', 'Brasil', '#3d3a33', ['Sangue Latino', 'O Vira', 'Rosa de Hiroshima']),
      d('Minas', 'Milton Nascimento', 'LP', 1975, 'MPB', 'EMI-Odeon', 'Brasil', '#4a6fa5', ['Paula e Bebeto', 'Fé Cega, Faca Amolada', 'Beijo Partido']),
      d('Fa-Tal: Gal a Todo Vapor', 'Gal Costa', 'LP', 1971, 'MPB', 'Philips', 'Brasil', '#a8483f', ['Vapor Barato', 'Fruta Gogóia', 'Como 2 e 2'], 'LP Duplo'),
    ],
  },
  {
    id_usuario: 2, // Maria — prensagens nacionais dos anos 70 e jazz
    armarios: [
      ['Sala', 'Armário dos Vinis'],
      ['Sala', 'Armário do Toca-Discos'],
      ['Biblioteca', 'Armário de Jazz'],
      ['Quarto de Hóspedes', 'Armário Antigo'],
    ],
    discos: [
      d('Krig-ha, Bandolo!', 'Raul Seixas', 'LP', 1973, 'Rock', 'Philips', 'Brasil', '#6e3b2f', ['Ouro de Tolo', 'Mosca na Sopa', 'Metamorfose Ambulante']),
      d('Tim Maia', 'Tim Maia', 'LP', 1970, 'Soul', 'Polydor', 'Brasil', '#c28f2c', ['Azul da Cor do Mar', 'Coroné Antonio Bento', 'Primavera (Vai Chuva)']),
      d('África Brasil', 'Jorge Ben', 'LP', 1976, 'Funk', 'Philips', 'Brasil', '#9c4a1a', ['Taj Mahal', 'Ponta de Lança Africano (Umbabarauma)', 'Xica da Silva']),
      d('Geraes', 'Milton Nascimento', 'LP', 1976, 'MPB', 'EMI-Odeon', 'Brasil', '#57744a', ['O Que Será (À Flor da Terra)', 'Fazenda', 'Caldeira']),
      d('Elis & Tom', 'Elis Regina & Tom Jobim', 'LP', 1974, 'Bossa Nova', 'Philips', 'Brasil', '#4f7f8c', ['Águas de Março', 'Só Tinha de Ser com Você', 'Corcovado']),
      d('Gita', 'Raul Seixas', 'LP', 1974, 'Rock', 'Philips', 'Brasil', '#7a5c2e', ['Gita', 'Medo da Chuva', 'Sociedade Alternativa']),
      d('Blue Train', 'John Coltrane', 'LP', 1958, 'Jazz', 'Blue Note', 'EUA', '#27506b', ['Blue Train', "Moment's Notice", 'Locomotion']),
      d('Mingus Ah Um', 'Charles Mingus', 'LP', 1959, 'Jazz', 'Columbia', 'EUA', '#b5462f', ['Better Git It in Your Soul', 'Goodbye Pork Pie Hat', 'Fables of Faubus']),
      d('Time Out', 'The Dave Brubeck Quartet', 'LP', 1959, 'Jazz', 'Columbia', 'EUA', '#c4703a', ['Blue Rondo à la Turk', 'Strange Meadow Lark', 'Take Five']),
      d('Paêbirú', 'Lula Côrtes & Zé Ramalho', 'LP', 1975, 'Rock', 'Rozenblit', 'Brasil', '#6b4f7a', ['Trilha de Sumé', 'Harpa dos Ares', 'Beira Mar'], 'LP Duplo'),
    ],
  },
  {
    id_usuario: 3, // João — o que tocava no rádio nos anos 80 e 90
    armarios: [
      ['Garagem', 'Armário de Aço'],
      ['Quarto', 'Armário do Som'],
      ['Sala', 'Armário Baixo'],
      ['Lavanderia', 'Armário Suspenso'],
    ],
    discos: [
      d('Thriller', 'Michael Jackson', 'LP', 1982, 'Pop', 'Epic', 'EUA', '#c9c2b4', ['Beat It', 'Billie Jean', 'Thriller']),
      d('Purple Rain', 'Prince and the Revolution', 'LP', 1984, 'Pop', 'Warner Bros.', 'EUA', '#5b2a86', ["Let's Go Crazy", 'When Doves Cry', 'Purple Rain']),
      d('Rádio Pirata ao Vivo', 'RPM', 'LP', 1986, 'Rock', 'Epic', 'Brasil', '#7d2f3a', ['Olhar 43', 'Louras Geladas', 'Alvorada Voraz']),
      d('Ideologia', 'Cazuza', 'LP', 1988, 'Rock', 'PolyGram', 'Brasil', '#8e8e3a', ['Ideologia', 'Brasil', 'Faz Parte do Meu Show']),
      d('Selvagem?', 'Os Paralamas do Sucesso', 'LP', 1986, 'Rock', 'EMI', 'Brasil', '#c7a12e', ['Alagados', 'A Novidade', 'Melô do Marinheiro']),
      d('Nós Vamos Invadir Sua Praia', 'Ultraje a Rigor', 'LP', 1985, 'Rock', 'WEA', 'Brasil', '#2c7ea1', ['Nós Vamos Invadir Sua Praia', 'Inútil', 'Ciúme']),
      d('Raio X do Brasil', 'Racionais MCs', 'LP', 1993, 'Rap', 'Zimbabwe', 'Brasil', '#292929', ['Fim de Semana no Parque', 'Homem na Estrada', 'Mano na Porta do Bar']),
      d('Usuário', 'Planet Hemp', 'CD', 1995, 'Rap', 'Superdemo', 'Brasil', '#3f6b38', ['Mantenha o Respeito', 'Legalize Já', 'Phunky Buddha']),
      d('Nevermind', 'Nirvana', 'CD', 1991, 'Rock', 'DGC', 'EUA', '#2f7fb8', ['Smells Like Teen Spirit', 'Come as You Are', 'Lithium']),
      d('Back in Black', 'AC/DC', 'LP', 1980, 'Rock', 'Atlantic', 'Austrália', '#1f1f1f', ['Hells Bells', 'You Shook Me All Night Long', 'Back in Black']),
    ],
  },
  {
    id_usuario: 4, // Pedro — CDs dos anos 90
    armarios: [
      ['Escritório', 'Armário dos CDs'],
      ['Sala', 'Armário Branco'],
      ['Quarto', 'Armário de Correr'],
      ['Sótão', 'Armário de Madeira'],
    ],
    discos: [
      d('Roots', 'Sepultura', 'CD', 1996, 'Metal', 'Roadrunner', 'Brasil', '#6b4a2b', ['Roots Bloody Roots', 'Attitude', 'Ratamahatta']),
      d('Samba Poconé', 'Skank', 'CD', 1996, 'Pop', 'Sony Music', 'Brasil', '#d08a2e', ['Garota Nacional', 'É uma Partida de Futebol']),
      d('Sobrevivendo no Inferno', 'Racionais MCs', 'CD', 1997, 'Rap', 'Cosa Nostra', 'Brasil', '#1e1e1e', ['Diário de um Detento', 'Capítulo 4, Versículo 3', 'Jorge da Capadócia']),
      d('Mamonas Assassinas', 'Mamonas Assassinas', 'CD', 1995, 'Rock', 'EMI', 'Brasil', '#d1c13a', ['Pelados em Santos', 'Vira-Vira', 'Robocop Gay']),
      d('O Descobrimento do Brasil', 'Legião Urbana', 'CD', 1993, 'Rock', 'EMI', 'Brasil', '#3f7f6b', ['Perfeição', 'Giz', 'Vinte e Nove']),
      d('Los Hermanos', 'Los Hermanos', 'CD', 1999, 'Rock', 'Abril Music', 'Brasil', '#a35c44', ['Anna Júlia', 'Primavera']),
      d('Verde, Anil, Amarelo, Cor de Rosa e Carvão', 'Marisa Monte', 'CD', 1994, 'MPB', 'EMI', 'Brasil', '#b56f8e', ['Segue o Seco', 'Maria de Verdade', 'Ao Meu Redor']),
      d('OK Computer', 'Radiohead', 'CD', 1997, 'Rock', 'Parlophone', 'Reino Unido', '#8fa9bd', ['Paranoid Android', 'Karma Police', 'No Surprises']),
      d('Definitely Maybe', 'Oasis', 'CD', 1994, 'Rock', 'Creation', 'Reino Unido', '#40566b', ['Live Forever', 'Supersonic', 'Cigarettes & Alcohol']),
      d('Ten', 'Pearl Jam', 'CD', 1991, 'Rock', 'Epic', 'EUA', '#7c3a4a', ['Even Flow', 'Alive', 'Jeremy']),
    ],
  },
  {
    id_usuario: 5, // Ana — jazz, bossa e contrabaixo acústico
    armarios: [
      ['Sala de Música', 'Armário do Contrabaixo'],
      ['Sala de Música', 'Armário de Cedro'],
      ['Estúdio', 'Armário de Bossa'],
      ['Varanda Fechada', 'Armário Rústico'],
    ],
    discos: [
      d('Chega de Saudade', 'João Gilberto', 'LP', 1959, 'Bossa Nova', 'Odeon', 'Brasil', '#3a6f73', ['Chega de Saudade', 'Brigas, Nunca Mais', 'Desafinado']),
      d('Wave', 'Antônio Carlos Jobim', 'LP', 1967, 'Bossa Nova', 'A&M', 'EUA', '#5f8a5c', ['Wave', 'Triste', 'Lamento']),
      d('A Love Supreme', 'John Coltrane', 'LP', 1965, 'Jazz', 'Impulse!', 'EUA', '#2d2d33', ['Acknowledgement', 'Resolution', 'Pursuance']),
      d("Moanin'", 'Art Blakey & The Jazz Messengers', 'LP', 1959, 'Jazz', 'Blue Note', 'EUA', '#5a4632', ["Moanin'", 'Along Came Betty', 'Blues March']),
      d('Waltz for Debby', 'Bill Evans Trio', 'LP', 1962, 'Jazz', 'Riverside', 'EUA', '#b0758d', ['My Foolish Heart', 'Waltz for Debby', 'Milestones']),
      d('Song for My Father', 'The Horace Silver Quintet', 'LP', 1965, 'Jazz', 'Blue Note', 'EUA', '#8a6d3b', ['Song for My Father', 'The Natives Are Restless Tonight', 'Calcutta Cutie']),
      d('Ella and Louis', 'Ella Fitzgerald & Louis Armstrong', 'LP', 1956, 'Jazz', 'Verve', 'EUA', '#a14f3c', ["Can't We Be Friends?", "Isn't This a Lovely Day?", 'Cheek to Cheek']),
      d('Os Afro-Sambas', 'Baden Powell & Vinicius de Moraes', 'LP', 1966, 'Bossa Nova', 'Forma', 'Brasil', '#3e5e4b', ['Canto de Ossanha', 'Canto de Xangô', 'Tempo de Amor']),
      d('Maiden Voyage', 'Herbie Hancock', 'LP', 1965, 'Jazz', 'Blue Note', 'EUA', '#2a6f97', ['Maiden Voyage', 'The Eye of the Hurricane', 'Dolphin Dance']),
      d("Herb Alpert Presents Sérgio Mendes & Brasil '66", "Sérgio Mendes & Brasil '66", 'LP', 1966, 'Bossa Nova', 'A&M', 'EUA', '#c9783a', ['Mas Que Nada', 'Água de Beber', 'Berimbau']),
    ],
  },
  {
    id_usuario: 90, // Admin Radiola — rock clássico
    armarios: [
      ['Sala de TV', 'Armário Preto'],
      ['Escritório', 'Armário de Arquivo'],
      ['Adega', 'Armário Climatizado'],
      ['Quarto', 'Armário Alto'],
    ],
    discos: [
      d('The Dark Side of the Moon', 'Pink Floyd', 'LP', 1973, 'Rock', 'Harvest', 'Reino Unido', '#1c1c24', ['Time', 'Money', 'Us and Them']),
      d('Abbey Road', 'The Beatles', 'LP', 1969, 'Rock', 'Apple', 'Reino Unido', '#6b8fa8', ['Come Together', 'Something', 'Here Comes the Sun']),
      d('Led Zeppelin IV', 'Led Zeppelin', 'LP', 1971, 'Rock', 'Atlantic', 'Reino Unido', '#8a7a5c', ['Black Dog', 'Rock and Roll', 'Stairway to Heaven']),
      d('Rumours', 'Fleetwood Mac', 'LP', 1977, 'Rock', 'Warner Bros.', 'EUA', '#a89a84', ['Dreams', 'Go Your Own Way', 'The Chain']),
      d('A Night at the Opera', 'Queen', 'LP', 1975, 'Rock', 'EMI', 'Reino Unido', '#b9a8d0', ["You're My Best Friend", 'Love of My Life', 'Bohemian Rhapsody']),
      d('The Rise and Fall of Ziggy Stardust and the Spiders from Mars', 'David Bowie', 'LP', 1972, 'Rock', 'RCA', 'Reino Unido', '#4a7c8c', ['Starman', 'Ziggy Stardust', 'Suffragette City']),
      d('Exile on Main St.', 'The Rolling Stones', 'LP', 1972, 'Rock', 'Rolling Stones Records', 'Reino Unido', '#4d4438', ['Rocks Off', 'Tumbling Dice', 'Shine a Light'], 'LP Duplo'),
      d('Highway 61 Revisited', 'Bob Dylan', 'LP', 1965, 'Rock', 'Columbia', 'EUA', '#c27a3e', ['Like a Rolling Stone', 'Ballad of a Thin Man', 'Desolation Row']),
      d('Born to Run', 'Bruce Springsteen', 'LP', 1975, 'Rock', 'Columbia', 'EUA', '#b5b0a5', ['Thunder Road', 'Born to Run', 'Jungleland']),
      d('Paranoid', 'Black Sabbath', 'LP', 1970, 'Metal', 'Vertigo', 'Reino Unido', '#3b3550', ['War Pigs', 'Paranoid', 'Iron Man']),
    ],
  },
  {
    id_usuario: 91, // Bia do Suporte — soul, pop e grandes vozes
    armarios: [
      ['Sala', 'Armário Amarelo'],
      ['Quarto', 'Armário da Penteadeira'],
      ['Copa', 'Armário de Louças'],
      ['Home Office', 'Armário Compacto'],
    ],
    discos: [
      d("What's Going On", 'Marvin Gaye', 'LP', 1971, 'Soul', 'Tamla', 'EUA', '#3e6a8a', ["What's Going On", 'Mercy Mercy Me (The Ecology)', 'Inner City Blues']),
      d('Songs in the Key of Life', 'Stevie Wonder', 'LP', 1976, 'Soul', 'Tamla', 'EUA', '#b4632f', ['Sir Duke', 'I Wish', 'As'], 'LP Duplo'),
      d('I Never Loved a Man the Way I Love You', 'Aretha Franklin', 'LP', 1967, 'Soul', 'Atlantic', 'EUA', '#a33a4f', ['Respect', 'Do Right Woman, Do Right Man', 'Dr. Feelgood']),
      d('Back to Black', 'Amy Winehouse', 'CD', 2006, 'Soul', 'Island', 'Reino Unido', '#2a2a2a', ['Rehab', 'Back to Black', 'Tears Dry on Their Own']),
      d('The Miseducation of Lauryn Hill', 'Lauryn Hill', 'CD', 1998, 'Hip Hop', 'Ruffhouse', 'EUA', '#7b5a3a', ['Ex-Factor', 'Doo Wop (That Thing)', 'Everything Is Everything']),
      d('Tapestry', 'Carole King', 'LP', 1971, 'Pop', 'Ode', 'EUA', '#a68a64', ['I Feel the Earth Move', "It's Too Late", "You've Got a Friend"]),
      d('Legend', 'Bob Marley & The Wailers', 'CD', 1984, 'Reggae', 'Island', 'Jamaica', '#3d8b5a', ['Is This Love', 'No Woman, No Cry', 'Three Little Birds'], 'Coletânea'),
      d('Blue', 'Joni Mitchell', 'LP', 1971, 'Pop', 'Reprise', 'Canadá', '#34628f', ['Carey', 'A Case of You', 'River']),
      d('Fruto Proibido', 'Rita Lee & Tutti Frutti', 'LP', 1975, 'Rock', 'Som Livre', 'Brasil', '#c0522d', ['Agora Só Falta Você', 'Ovelha Negra', 'Esse Tal de Roque Enrow']),
      d('Mais', 'Marisa Monte', 'CD', 1991, 'MPB', 'EMI', 'Brasil', '#8f6d9c', ['Beija Eu', 'Ainda Lembro', 'Eu Sei (Na Mira)']),
    ],
  },
  {
    id_usuario: 92, // Caio Financeiro — samba, nordeste e MPB
    armarios: [
      ['Sala', 'Armário de Jacarandá'],
      ['Escritório', 'Armário Trancado'],
      ['Quarto', 'Armário de Duas Portas'],
      ['Área de Serviço', 'Armário Multiuso'],
    ],
    discos: [
      d('Claridade', 'Clara Nunes', 'LP', 1975, 'Samba', 'Odeon', 'Brasil', '#c79a3a', ['O Mar Serenou', 'A Deusa dos Orixás']),
      d('Nervos de Aço', 'Paulinho da Viola', 'LP', 1973, 'Samba', 'Odeon', 'Brasil', '#4a5f7a', ['Nervos de Aço', 'Sentimentos']),
      d('Zeca Pagodinho', 'Zeca Pagodinho', 'LP', 1986, 'Pagode', 'RGE', 'Brasil', '#a2563a', ['Judia de Mim', 'Camarão Que Dorme a Onda Leva']),
      d('De Pé no Chão', 'Beth Carvalho', 'LP', 1978, 'Samba', 'RCA', 'Brasil', '#7f9a4a', ['Vou Festejar', 'Agoniza Mas Não Morre']),
      d('Cavalo de Pau', 'Alceu Valença', 'LP', 1982, 'MPB', 'Ariola', 'Brasil', '#b8703a', ['Tropicana', 'Como Dois Animais']),
      d('Manera Fru Fru, Manera', 'Fagner', 'LP', 1973, 'MPB', 'Philips', 'Brasil', '#5e7f7a', ['Canteiros', 'Último Pau-de-Arara']),
      d('Zé Ramalho', 'Zé Ramalho', 'LP', 1978, 'MPB', 'CBS', 'Brasil', '#6d5a84', ['Avohai', 'Chão de Giz', 'Vila do Sossego']),
      d('Luz', 'Djavan', 'LP', 1982, 'MPB', 'CBS', 'Brasil', '#d0a63f', ['Samurai', 'Sina', 'Açaí']),
      d('Pérola Negra', 'Luiz Melodia', 'LP', 1973, 'MPB', 'Philips', 'Brasil', '#333338', ['Pérola Negra', 'Estácio, Holly Estácio', 'Forró de Janeiro']),
      d('O Canto da Cidade', 'Daniela Mercury', 'CD', 1992, 'Axé', 'Sony Music', 'Brasil', '#d9652e', ['O Canto da Cidade', 'Música de Rua']),
    ],
  },
];

const montarFaixas = (idItem, disco) =>
  disco.faixas.map((titulo, i) => ({
    id: idItem * 10 + i + 1,
    numero: i + 1,
    lado: disco.tipo_midia !== 'LP' ? null : i < disco.faixas.length / 2 ? 'A' : 'B',
    titulo,
    duracao_segundos: 170 + ((idItem + i * 7) % 12) * 15,
  }));

function montarCatalogos() {
  let id = ID_INICIAL;
  return COLECOES.flatMap(({ id_usuario, armarios, discos }) => {
    const ocupacao = armarios.map(() => 0); // quantos discos já estão em cada armário
    return discos.map((disco, i) => {
      const indiceArmario = DISTRIBUICAO[i];
      const [local_principal, movel] = armarios[indiceArmario];
      const lugar = ++ocupacao[indiceArmario];
      const idItem = id++;
      const estado = ESTADOS[i % ESTADOS.length];
      return {
        id: idItem,
        id_usuario,
        titulo: disco.titulo,
        artista: disco.artista,
        tipo_midia: disco.tipo_midia,
        subtipo: disco.subtipo,
        ano_lancamento: disco.ano_lancamento,
        genero: disco.genero,
        gravadora: disco.gravadora,
        pais_origem: disco.pais_origem,
        numero_catalogo: '',
        codigo_barras: '',
        ...(disco.tipo_midia === 'LP' ? { velocidade: '33⅓', cor_vinil: 'Preto' } : {}),
        estado_conservacao: estado,
        estado_capa: estado,
        preco_pago: PRECOS[i],
        valor_estimado: PRECOS[i] * 2,
        notas_pessoais: '',
        cor_capa: disco.cor_capa,
        publico: i % 5 !== 4, // 1 em cada 5 fica fora da estante pública, para testar a privacidade
        data_cadastro: `2026-10-${String(i + 10).padStart(2, '0')}T10:00:00`,
        localizacao: {
          local_principal,
          movel,
          prateleira: `Prateleira ${Math.ceil(lugar / 2)}`, // cada prateleira guarda 2 discos
          posicao: `Posição ${((lugar - 1) % 2) + 1}`,
          data_movimentacao: '2026-10-20T10:00:00',
        },
        faixas: montarFaixas(idItem, disco),
      };
    });
  });
}

export const catalogosMock = montarCatalogos();
