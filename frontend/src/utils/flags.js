const TEAM_ISO = {
  '대한민국': 'kr', '체코': 'cz', '멕시코': 'mx', '남아프리카공화국': 'za',
  '미국': 'us', '캐나다': 'ca', '우루과이': 'uy', '파나마': 'pa',
  '스페인': 'es', '모로코': 'ma', '포르투갈': 'pt', '카메룬': 'cm',
  '브라질': 'br', '크로아티아': 'hr', '아르헨티나': 'ar', '칠레': 'cl',
  '프랑스': 'fr', '세네갈': 'sn', '잉글랜드': 'gb-eng', '튀니지': 'tn',
  '네덜란드': 'nl', '일본': 'jp', '스웨덴': 'se',
  '독일': 'de', '이탈리아': 'it', '벨기에': 'be', '코트디부아르': 'ci',
  '이집트': 'eg', '사우디': 'sa', '사우디아라비아': 'sa', '남아공': 'za',
  '코스타리카': 'cr', '오스트리아': 'at', '페루': 'pe', '웨일스': 'gb-wls', '온두라스': 'hn',
  '이란': 'ir', '호주': 'au', '나이지리아': 'ng',
  '스위스': 'ch', '콜롬비아': 'co', '에콰도르': 'ec', '가나': 'gh',
  '터키': 'tr', '덴마크': 'dk', '볼리비아': 'bo',
  '세르비아': 'rs', '카타르': 'qa', '폴란드': 'pl', '알제리': 'dz',
}

export function getFlagUrl(teamName) {
  const iso = TEAM_ISO[teamName]
  return iso ? `${import.meta.env.BASE_URL}flags/${iso}.png` : null
}
