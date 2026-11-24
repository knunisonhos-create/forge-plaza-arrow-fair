import { X } from 'lucide-react';

const LESSONS: Array<{ title: string; body: string }> = [
  {
    title: 'O que este manual é',
    body: 'Aqui está o que a campanha não explica no meio do céu. Leia com calma. Cada parte diz o que você vê na tela, o que apertar e o que acontece em seguida. O restante do jogo fala como mundo, não como aula.',
  },
  {
    title: 'Mover a nave',
    body: 'Você está dentro de um sistema solar. Clique num ponto vazio do mapa: a nave traça a rota até lá e desvia da estrela e dos planetas, sem cravar na crosta. Um segundo clique muda o destino. A câmera acompanha o casco. Enquanto a nave viaja, você pode abrir painéis; o voo não espera o menu fechar.',
  },
  {
    title: 'Entrar e sair de órbita',
    body: 'Escolha um planeta na lista ou no próprio mapa e use Viajar para órbita. A nave para na faixa orbital, do lado de fora da superfície, de frente para o mundo. Quase tudo que importa — escaneamento, comércio, conversa, mineração e descida — só acontece em órbita. Para sair, clique no espaço vazio ou escolha outro destino. A nave larga o planeta e segue.',
  },
  {
    title: 'Escanear um mundo',
    body: 'Em órbita, abra o planeta e use Escanear. O painel passa a mostrar o tipo de mundo, os depósitos, a fauna e os riscos do chão. Sem o escaneamento você ainda vê o planeta, mas não o que ele guarda. Fenômenos soltos no sistema — destroços, campos de meteoros, bolsas de gás, cometas — não se leem de longe: viaje até o local e só então o painel deixa minerar ou investigar.',
  },
  {
    title: 'Descer ao solo',
    body: 'A descida é uma expedição, não um pouso de mineração. Em órbita, inicie a descida. A equipe cataloga animais e pode voltar ferida. Esse ferimento sai da saúde da tripulação, não do casco da nave. Mundos muito civilizados já catalogaram a própria fauna. Mundo queimado não tem chão seguro: a descida é recusada.',
  },
  {
    title: 'Extrair recursos',
    body: 'Entre em órbita e abra as abas de solo ou de atmosfera. Cada recurso é um botão. A nave pousa em solo firme quando o mundo tem chão e a ferramenta trabalha sozinha. Você manda parar quando quiser. A extração também para se o compartimento de carga encher ou se a reserva secar, e a nave volta à órbita. Cada minério pede o extrator certo na nave. Sem essa peça, o botão avisa e não começa. Em gigante gasoso não há solo; a coleta de gás fica na órbita. Mundos de civilização alta podem exigir licença. Sem ela, a patrulha pode ferir a tripulação.',
  },
  {
    title: 'Mundo queimado',
    body: 'Bombardeio pesado ou um corpo em rota de colisão pode apagar a civilização de um planeta. Ele continua no céu, porém com cara de mundo vulcânico: crosta escura e brasa. A habitabilidade vai a zero. Não há facção, fauna, cidade nem descida. Ainda dá para extrair o que o fogo não consumiu: magma e enxofre, se a nave tiver a ferramenta certa. As outras naves abandonam esse céu. Só a sua entra, se você quiser. Um mundo chamado Prime, no auge da capital, não cai assim: a defesa local intercepta o cometa ou o asteroide antes do impacto.',
  },
  {
    title: 'Bombardeio',
    body: 'Com uma arma de bombardeio de nível dois ou mais, em órbita, você pode atirar contra a civilização de um mundo. O tiro pode derrubar o nível do planeta, e a defesa local sobe na hora. Se todos os mundos habitados de um sistema caírem a nível zero ou um, o setor vira espaço selvagem. A mesma classe de arma, nesse nível, também serve para estilhaçar um cometa ou um asteroide que ainda esteja em movimento, antes que ele encontre um planeta.',
  },
  {
    title: 'Comércio',
    body: 'Em órbita de um mundo civilizado, abra Comercializar. Cada linha traz o desenho da peça, o nome, a raridade, a quantidade que você tem, uma porcentagem e o preço. A porcentagem compara esse preço com o valor de tabela. Zero por cento quer dizer que os dois são iguais. Na compra, +20% em vermelho significa que está vinte por cento mais caro: um item de tabela 10 comprado por 12. −20% em verde significa vinte por cento mais barato: a tabela 10 comprada por 8. Na venda o sinal muda de lado. +30% em verde é lucro sobre a tabela, como vender por 13 o que vale 10. Um percentual negativo em vermelho, na venda, significa que o mundo paga menos que a tabela. O recurso também muda conforme o lugar. Se o planeta produz aquele minério, o mercado fica 15% abaixo da tabela. Se ele não produz, mas outro mundo do mesmo sistema produz, o preço fica em 0%, igual à tabela. Se nenhum mundo do sistema produz, o preço fica 15% acima da tabela. Isso vale para comprar e para vender. Além disso, cada recurso que você vende para um planeta fica 2% mais barato a cada 10 unidades, a partir da primeira, e só naquele planeta. As dez primeiras já saem 2% abaixo do preço do lugar. As dez seguintes, 4%, e assim por diante. Reputação, sede e o negociador ainda movem o número, e a porcentagem da linha já mostra o resultado final contra a tabela. Se o canto do card disser em dourado “você precisa disso”, aquele recurso entra num projeto de nave que você comprou, numa sede que você começou sem os materiais, ou numa missão de entrega ainda aberta, e o aviso fica até o objetivo terminar.',
  },
  {
    title: 'Reputação',
    body: 'Onde houver uma facção, leia “Sua reputação com essa facção”. O número fica verde acima de oitenta e vermelho se estiver negativo. Zero não é inimizade: é neutro. Ninguém abre fogo só porque você ainda não fez nome. A reputação aparece no planeta, no rodapé do sistema, no encontro e no códex. Subir de reputação pede comércio justo, missões e diplomacia. Descer pede tiro, intrusão e salto para o território de quem já o odeia.',
  },
  {
    title: 'Aliança',
    body: 'Uma aliança formal só é oferecida se a sua reputação com aquela facção passou de oitenta e se vocês não estão em guerra. Não importa a distância, a facção de origem da campanha nem o que as outras casas pensam. O botão fica em Facções e Códex. Se recusarem, ainda falta reputação ou ainda há guerra aberta.',
  },
  {
    title: 'Guerra',
    body: 'Facções brigam entre si sem você. Isso não é guerra sua. Um encontro só leva o selo de conflito de guerra quando aquela facção está em guerra contra a sua. Reputação zero é neutro: desconhecido, não inimigo, e não abre fogo. O painel de guerra mostra o poderio militar de cada lado e a chance de a frente avançar. Casas mais armadas e mundos mais altos empurram com mais força. Se a nave que você pilota pertence a uma facção em guerra e você salta para um sistema do inimigo dela, já perde um pouco de reputação com o dono do sistema. Destruir uma nave inimiga tira bastante reputação da facção dela e empurra três pontos, em todas as guerras dessa facção, contra quem você abateu.',
  },
  {
    title: 'Combate e fuga',
    body: 'No espaço aparecem cinco encontros. Comercial é compra e venda. Diplomático oferece uma missão. Hostil só aparece se a reputação com aquela facção está em -10 ou pior. Guerra só acontece com uma facção que está em guerra contra a sua. Caçada é o alvo de uma missão de combate, no sistema dela. Naves hostis se aproximam e atiram. A sua arma dispara sozinha quando o alvo entra no alcance. No painel de combate dá para usar consumíveis e habilidades. Fugir tece uma rota entre planetas por alguns segundos; a perícia dos pilotos aumenta a chance de escapar. Se a fuga falha, o tiro continua. Comprar e pilotar o casco de outra facção muda a facção ativa da campanha, e com ela muda quem o considera inimigo.',
  },
  {
    title: 'Quando o casco chega a zero',
    body: 'A cápsula de resgate é ejetada e devolve você ao setor de origem, com o casco só em parte restaurado. O compartimento de carga inteiro fica no naufrágio. O resgate também cobra um quinto dos créditos que você tinha. A tripulação e a campanha continuam. Se preferir, o mesmo aviso deixa começar uma campanha nova.',
  },
  {
    title: 'Tripulação e saúde',
    body: 'Cada posto — piloto, engenheiro, negociador, explorador, minerador, diplomata, mestre — melhora um ofício. A saúde da tripulação é outra barra, ao lado dos mantimentos, sob o título Suprimento e Saúde. Ferimento em solo, em expedição e em certos encontros tira saúde, não casco. Quanto mais baixa a saúde, pior cada um trabalha. Abaixo de trinta por cento, a cada ciclo galáctico — cerca de três minutos — um tripulante pode morrer. O mestre de tripulação e alguns dons de origem recuperam saúde aos poucos. Cada facção vende um remédio; alguns também aumentam o quanto a saúde pode chegar.',
  },
  {
    title: 'Mantimentos, combustível e salto',
    body: 'Fora de órbita a tripulação come. Os mantimentos caem mais depressa em trânsito do que parados junto a um mundo. O combustível paga o salto. No mapa galáctico, os setores ao alcance do motor aparecem em anos-luz. Não há coordenadas numéricas: navegue pelo nome do sistema. Compre combustível e mantimentos no comércio antes de uma travessia longa. Sem combustível, o salto não acontece.',
  },
  {
    title: 'Missões e a nave',
    body: 'Aceite até cinco contratos. Alguns pedem recurso no compartimento de carga, outros um escaneamento, uma criatura ou um abate. O que você compra — peça, consumível ou recurso — vai primeiro para o compartimento de carga. Na nave, qualquer peça pode ser equipada e guardada de novo: arma, escudo, motor, extrator, utilidade e traje. No mesmo painel fica o Cofre da Facção. Ao lado de cada recurso, consumível e equipamento há o botão Enviar para o Cofre. O cofre não tem limite e não ocupa o compartimento. De lá, a peça pode ser equipada em qualquer nave da frota. Cada item guardado custa cinco créditos por ciclo galáctico. A cor da nave é a cor da facção dela, não a cor de quem domina o planeta da loja. Uma nave da Legião de Aço continua da Legião mesmo comprada em outro porto.',
  },
  {
    title: 'Códex e raridade',
    body: 'Facções e Códex lista facções, raças, formas de vida, mundos, fauna, itens e habilidades. O cartão é só a capa. Clique: um dossiê abre à esquerda com a história, o modo de pensar, o comportamento e o que aquele mundo ou aquela criatura deixa levar. Equipamentos não têm um nível separado da raridade. Comum, incomum, raro, épico, lendário e único já dizem o patamar da peça. O nível que ainda aparece nos mundos é a civilização do planeta, de menos um até cinco. Menos um é o mundo queimado. Cinco é a capital.',
  },
];

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex justify-end">
      <button type="button" className="flex-1 cursor-pointer" aria-label="Fechar tutorial" onClick={onClose} />
      <aside className="h-full w-[min(480px,100%)] overflow-y-auto bg-[#070d18] border-l border-cyan-500/30 text-slate-100 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-cyan-300">Manual de bordo</div>
            <h2 className="font-display text-xl font-bold text-white">Tutorial</h2>
            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
              Leia uma parte de cada vez. O céu lá fora não repete estas explicações.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {LESSONS.map((lesson) => (
          <section key={lesson.title} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
            <h3 className="text-sm font-semibold text-cyan-200">{lesson.title}</h3>
            <p className="text-[13px] leading-relaxed text-slate-300">{lesson.body}</p>
          </section>
        ))}
      </aside>
    </div>
  );
}
