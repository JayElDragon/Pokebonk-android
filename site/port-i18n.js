/* Port Android de JayElDragon: textos propios del port en los 9 idiomas del juego.
   window.pbT('clave', {var}) devuelve el texto en el idioma activo (document.documentElement.lang). */
(() => {
  const D = {
    nav:        { es: 'Navegación principal', en: 'Main navigation', pt: 'Navegação principal', fr: 'Navigation principale', ja: 'メインナビゲーション', zh: '主导航', zht: '主導覽', ko: '메인 메뉴', ru: 'Главное меню' },
    home:       { es: 'Inicio', en: 'Home', pt: 'Início', fr: 'Accueil', ja: 'ホーム', zh: '首页', zht: '首頁', ko: '홈', ru: 'Главная' },
    legal:      { es: 'Fan game no oficial y gratuito. Pokémon y sus personajes pertenecen a Nintendo / Creatures / GAME FREAK.',
                  en: 'Unofficial, free fan game. Pokémon and its characters belong to Nintendo / Creatures / GAME FREAK.',
                  pt: 'Fan game não oficial e gratuito. Pokémon e seus personagens pertencem à Nintendo / Creatures / GAME FREAK.',
                  fr: 'Fan game non officiel et gratuit. Pokémon et ses personnages appartiennent à Nintendo / Creatures / GAME FREAK.',
                  ja: '非公式の無料ファンゲームです。ポケモンとそのキャラクターは Nintendo / Creatures / GAME FREAK に帰属します。',
                  zh: '非官方免费同人游戏。宝可梦及其角色归 Nintendo / Creatures / GAME FREAK 所有。',
                  zht: '非官方免費同人遊戲。寶可夢及其角色歸 Nintendo / Creatures / GAME FREAK 所有。',
                  ko: '비공식 무료 팬 게임입니다. 포켓몬과 그 캐릭터의 권리는 Nintendo / Creatures / GAME FREAK에 있습니다.',
                  ru: 'Неофициальная бесплатная фан-игра. Покемоны и их персонажи принадлежат Nintendo / Creatures / GAME FREAK.' },
    author:     { es: 'Port para Android de JayElDragon', en: 'Android port by JayElDragon', pt: 'Port para Android por JayElDragon', fr: 'Portage Android par JayElDragon', ja: 'Android移植：JayElDragon', zh: 'Android 移植：JayElDragon', zht: 'Android 移植：JayElDragon', ko: 'Android 포트: JayElDragon', ru: 'Android-порт от JayElDragon' },
    companion:  { es: 'Tu compañero', en: 'Your companion', pt: 'Seu parceiro', fr: 'Ton compagnon', ja: 'あなたの相棒', zh: '你的伙伴', zht: '你的夥伴', ko: '나의 파트너', ru: 'Твой напарник' },
    last:       { es: 'Última partida', en: 'Last run', pt: 'Última partida', fr: 'Dernière partie', ja: '前回のプレイ', zh: '上一局', zht: '上一局', ko: '최근 플레이', ru: 'Последний забег' },
    time:       { es: 'Tiempo', en: 'Time', pt: 'Tempo', fr: 'Temps', ja: 'タイム', zh: '时间', zht: '時間', ko: '시간', ru: 'Время' },
    kills:      { es: 'Bajas', en: 'KOs', pt: 'Nocautes', fr: 'K.O.', ja: '撃破数', zh: '击倒', zht: '擊倒', ko: '처치', ru: 'Нокауты' },
    level:      { es: 'Nivel', en: 'Level', pt: 'Nível', fr: 'Niveau', ja: 'レベル', zh: '等级', zht: '等級', ko: '레벨', ru: 'Уровень' },
    empty:      { es: 'Tu aventura empieza aquí', en: 'Your adventure starts here', pt: 'Sua aventura começa aqui', fr: 'Ton aventure commence ici', ja: '冒険はここから始まる', zh: '你的冒险从这里开始', zht: '你的冒險從這裡開始', ko: '모험은 여기서 시작돼요', ru: 'Твоё приключение начинается здесь' },
    hint:       { es: 'El resumen aparecerá tras tu primera partida.', en: 'Your first run will appear here.', pt: 'Sua primeira partida aparecerá aqui.', fr: 'Ta première partie apparaîtra ici.', ja: '最初のプレイ後にここに表示されます。', zh: '第一局结束后会显示在这里。', zht: '第一局結束後會顯示在這裡。', ko: '첫 플레이 후 여기에 표시됩니다.', ru: 'Здесь появится твой первый забег.' },
    runs:       { es: 'Partidas', en: 'Runs', pt: 'Partidas', fr: 'Parties', ja: 'プレイ回数', zh: '局数', zht: '局數', ko: '플레이', ru: 'Забеги' },
    wins:       { es: 'Victorias', en: 'Wins', pt: 'Vitórias', fr: 'Victoires', ja: '勝利', zh: '胜利', zht: '勝利', ko: '승리', ru: 'Победы' },
    editName:   { es: 'Editar nombre', en: 'Edit name', pt: 'Editar nome', fr: 'Modifier le nom', ja: '名前を変更', zh: '修改名字', zht: '修改名字', ko: '이름 변경', ru: 'Изменить имя' },
    trainerName:{ es: 'Nombre del entrenador', en: 'Trainer name', pt: 'Nome do treinador', fr: 'Nom du dresseur', ja: 'トレーナー名', zh: '训练家名字', zht: '訓練家名字', ko: '트레이너 이름', ru: 'Имя тренера' },
    save:       { es: 'Guardar', en: 'Save', pt: 'Salvar', fr: 'Enregistrer', ja: '保存', zh: '保存', zht: '儲存', ko: '저장', ru: 'Сохранить' },
    cancel:     { es: 'Cancelar', en: 'Cancel', pt: 'Cancelar', fr: 'Annuler', ja: 'キャンセル', zh: '取消', zht: '取消', ko: '취소', ru: 'Отмена' },
    enterName:  { es: 'Escribe tu nombre', en: 'Enter your name', pt: 'Digite seu nome', fr: 'Saisis ton nom', ja: '名前を入力してください', zh: '请输入名字', zht: '請輸入名字', ko: '이름을 입력하세요', ru: 'Введи имя' },
    nameLength: { es: 'Escribe un nombre de 1 a 24 caracteres.', en: 'Enter a name between 1 and 24 characters.', pt: 'Digite um nome de 1 a 24 caracteres.', fr: 'Saisis un nom de 1 à 24 caractères.', ja: '1〜24文字の名前を入力してください。', zh: '请输入 1 到 24 个字符的名字。', zht: '請輸入 1 到 24 個字元的名字。', ko: '1~24자의 이름을 입력하세요.', ru: 'Введи имя длиной от 1 до 24 символов.' },
    nameSaved:  { es: 'Nombre guardado: {name}', en: 'Name saved: {name}', pt: 'Nome salvo: {name}', fr: 'Nom enregistré : {name}', ja: '名前を保存しました：{name}', zh: '名字已保存：{name}', zht: '名字已儲存：{name}', ko: '이름 저장됨: {name}', ru: 'Имя сохранено: {name}' },
    menuBg:     { es: 'Fondo del menú', en: 'Menu background', pt: 'Fundo do menu', fr: 'Fond du menu', ja: 'メニューの背景', zh: '菜单背景', zht: '選單背景', ko: '메뉴 배경', ru: 'Фон меню' },
    menuBgSub:  { es: 'Escenarios originales con Pokémon animados', en: 'Original scenes with animated Pokémon', pt: 'Cenários originais com Pokémon animados', fr: 'Décors originaux avec des Pokémon animés', ja: 'ポケモンが動くオリジナルの風景', zh: '带有动态宝可梦的原创场景', zht: '帶有動態寶可夢的原創場景', ko: '포켓몬이 움직이는 오리지널 배경', ru: 'Оригинальные сцены с анимированными покемонами' },
    pond:       { es: 'Estanque', en: 'Pond', pt: 'Lago', fr: 'Étang', ja: '池', zh: '池塘', zht: '池塘', ko: '연못', ru: 'Пруд' },
    menuMusic:  { es: 'Música del menú', en: 'Menu music', pt: 'Música do menu', fr: 'Musique du menu', ja: 'メニューの音楽', zh: '菜单音乐', zht: '選單音樂', ko: '메뉴 음악', ru: 'Музыка меню' },
    menuMusicSub:{ es: 'Normal o Halloween; la música de las partidas no cambia', en: 'Normal or Halloween; in-game music stays the same', pt: 'Normal ou Halloween; a música das partidas não muda', fr: 'Normale ou Halloween ; la musique en partie ne change pas', ja: '通常かハロウィン。プレイ中の音楽は変わりません', zh: '普通或万圣节；对局中的音乐不变', zht: '一般或萬聖節；對局中的音樂不變', ko: '일반 또는 할로윈. 게임 중 음악은 바뀌지 않습니다', ru: 'Обычная или хеллоуинская; музыка в забегах не меняется' },
    auto:       { es: 'Automática', en: 'Automatic', pt: 'Automática', fr: 'Automatique', ja: '自動', zh: '自动', zht: '自動', ko: '자동', ru: 'Авто' },
    normal:     { es: 'Normal', en: 'Normal', pt: 'Normal', fr: 'Normale', ja: '通常', zh: '普通', zht: '一般', ko: '일반', ru: 'Обычная' },
  };
  const lang = () => {
    const l = (document.documentElement.lang || 'en').toLowerCase();
    if (l === 'zht' || l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.includes('hant')) return 'zht';
    const k = l.split('-')[0];
    return ['es', 'en', 'pt', 'fr', 'ja', 'zh', 'ko', 'ru'].includes(k) ? k : 'en';
  };
  window.pbLang = lang;
  window.pbT = (key, vars) => {
    const entry = D[key];
    let text = entry ? (entry[lang()] ?? entry.en) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.split('{' + k + '}').join(String(v));
    return text;
  };
})();
