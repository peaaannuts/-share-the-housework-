import type { ChoreCategory } from '../types'

export interface HouseworkTip {
  id: string
  category: ChoreCategory
  title: string
  body: string
  /**
   * Illustration served from `public/tips/` (e.g. '/tips/laundry-01.webp').
   * Optional on purpose: a tip without one falls back to its category emoji,
   * so the collection works before any artwork exists and each picture can be
   * dropped in later just by adding the file and filling this field.
   *
   * Keep new files light — WebP, ~800px on the long edge, 40-60KB. They are
   * excluded from the service worker precache (see vite.config.ts) and load
   * only when a tip is actually opened.
   */
  image?: string
}

/** Deliberately in a module of its own so it ships in the lazy gacha chunk. */
export const HOUSEWORK_TIPS: HouseworkTip[] = [
  {
    id: 'cook-mise-en-place',
    category: '料理',
    title: '切る係と焼く係を分ける',
    body: 'ふたりで台所に立つときは、同じ工程を追いかけるより「切る人」「火にかける人」で分けたほうが早く終わります。手が空いた人が洗い物に回ると、食べ終わったあとがぐっと楽になります。',
  },
  {
    id: 'cook-soak-rice',
    category: '料理',
    title: '米は炊く30分前に水へ',
    body: '浸水させてから炊くと、同じ米でも粒の芯が残りにくくなります。朝のうちに研いで水に浸け、冷蔵庫に入れておくと、帰ってからスイッチを押すだけです。',
  },
  {
    id: 'cook-freeze-flat',
    category: '料理',
    title: '冷凍は「平ら」が正解',
    body: '袋に入れた食材は平らにならして冷凍すると、凍るのも解けるのも早くなります。立てて並べれば場所も取らず、何があるか一目で分かります。',
  },
  {
    id: 'cook-clean-as-you-go',
    category: '料理',
    title: '煮ている間に洗ってしまう',
    body: '火にかけている数分は待ち時間ではなく洗い物の時間です。作り終わったときに流しが空いていると、片づけが「あと少し」で済みます。',
  },
  {
    id: 'laundry-dose-by-water',
    category: '洗濯',
    title: '洗剤の量は「水量」で決める',
    body: '洗剤は衣類の量ではなく水量に合わせるのが基本です。多すぎるとすすぎ残りの原因になり、生乾きのにおいにもつながります。',
  },
  {
    id: 'laundry-shake-before-hang',
    category: '洗濯',
    title: '干す前にひと振り',
    body: '干す前に大きくひと振りしてシワを伸ばすと、乾いたあとのたたむ手間とアイロンが減ります。手間は2秒、効果はその日ずっとです。',
  },
  {
    id: 'laundry-dry-the-drum',
    category: '洗濯',
    title: '洗濯槽はふたを開けて乾かす',
    body: '使い終わったらふたを開けておくだけで、洗濯槽のカビはかなり抑えられます。月に一度の槽洗浄と合わせると、においの元がたまりません。',
  },
  {
    id: 'laundry-fold-where-it-lives',
    category: '洗濯',
    title: 'しまう場所の近くでたたむ',
    body: 'たたむ場所としまう場所が離れていると、「たたんだのに運んでいない山」ができます。しまう場所のそばでたたむだけで、その山は生まれません。',
  },
  {
    id: 'clean-top-down',
    category: '掃除',
    title: '掃除は上から下へ',
    body: 'ほこりは必ず落ちてきます。棚や照明を先に、床を最後にすると二度手間になりません。順番を変えるだけで、同じ労力でもきれいさが変わります。',
  },
  {
    id: 'clean-bath-cold-rinse',
    category: '掃除',
    title: '風呂は最後に冷水をかける',
    body: '入浴後に壁と床へ冷水をかけて温度を下げると、カビが育ちにくくなります。換気扇を回しておけば、こするタイミングはずっと先で済みます。',
  },
  {
    id: 'clean-drain-weekly',
    category: '掃除',
    title: '排水口は「ためない」が一番早い',
    body: '週に一度さっと流すだけなら数十秒ですが、ためてからだと覚悟のいる作業になります。曜日を決めて、気づいた人がやると続きます。',
  },
  {
    id: 'clean-five-minutes',
    category: '掃除',
    title: '5分だけやる',
    body: '「全部きれいにする」と思うと腰が重くなります。5分で区切ると意外と片づき、途中でやめても昨日より散らかってはいません。',
  },
  {
    id: 'trash-night-before',
    category: 'ゴミ出し',
    title: '前の晩にまとめておく',
    body: '朝にまとめようとすると、たいてい間に合いません。寝る前に玄関まで出しておけば、朝は持って出るだけです。',
  },
  {
    id: 'shopping-shared-list',
    category: '買い物',
    title: '買い物メモはふたりで1つ',
    body: '気づいた人がその場で足せる共有のメモがあると、「切らしていたのに買い忘れた」が減ります。買う人が誰でも同じものを買って帰れます。',
  },
  {
    id: 'shopping-photo-stock',
    category: '買い物',
    title: '在庫は写真で確認する',
    body: '出かける前に冷蔵庫と洗面所の棚を1枚ずつ撮っておくと、店で迷いません。同じものを2つ買うことも、買い忘れも減ります。',
  },
  {
    id: 'other-visible-turn',
    category: 'その他',
    title: '「名前のない家事」に名前をつける',
    body: 'ゴミ袋の交換、シャンプーの詰め替え、電池の買い置き。名前がないと数にも入らず、気づいた側が黙って背負いがちです。家事として登録してしまえば、ちゃんと分けられます。',
  },
]
