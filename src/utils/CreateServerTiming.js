exports.createServerTiming = (timingArr) => {
  let str = "";
  for (let i = 0; i < timingArr.length; i++) {
    if (i < timingArr.length - 1) {
      str += `${i};desc="${timingArr[i + 1].d}";dur=${
        timingArr[i + 1].t - timingArr[i].t
      },`;
    }
  }
  return str;
};
