//Turn a string of 24h time into words.

//dictionary mapping first part of string to first word and last word of final string
const firstDict = {
  "00": ["twelve", "am"],
  "01": ["one", "am"],
  "02": ["two", "am"],
  "03": ["three", "am"],
  "04": ["four", "am"],
  "05": ["five", "am"],
  "06": ["six", "am"],
  "07": ["seven", "am"],
  "08": ["eight", "am"],
  "09": ["nine", "am"],
  10: ["ten", "am"],
  11: ["eleven", "am"],
  12: ["twelve", "pm"],
  13: ["one", "pm"],
  14: ["two", "pm"],
  15: ["three", "pm"],
  16: ["four", "pm"],
  17: ["five", "pm"],
  18: ["six", "pm"],
  19: ["seven", "pm"],
  20: ["eight", "pm"],
  21: ["nine", "pm"],
  22: ["ten", "pm"],
  23: ["eleven", "pm"],
};
//dictionary mapping second part of string to edge cases
const secondDict = {
  0: "o'clock",
  10: "ten",
  11: "eleven",
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
  15: "fifteen",
  16: "sixteen",
  17: "seventeen",
  18: "eighteen",
  19: "nineteen",
  20: "twenty",
  30: "thirty",
  40: "fourty",
  50: "fifty",
};
//dictionary mapping second part of string to non-edge cases
const oneToNine = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
};

function timeWord(str) {
  //array will hold parts of final string
  const finalStringArr = [];
  //edge cases: midnight and noon
  if (str === "12:00") {
    return "noon";
  } else if (str === "00:00") {
    return "midnight";
  }

  //split time into two parts
  const first = str.split(":")[0];
  const second = str.split(":")[1];

  //extrapolate based on first part: collect first and last word of final string
  finalStringArr.push(firstDict[first][0]);
  finalStringArr.push(firstDict[first][1]);

  //extrapolate based on second part: look up middle word(s)
  const middleString = getMiddleWords(second);

  //insert the middle word(s) into array at position 2
  finalStringArr.splice(1, 0, middleString);

  return finalStringArr.join(" ");
}

function getMiddleWords(str) {
  num = Number(str);
  //handle edge cases first (0, 10, 20, 30 etc)
  if (secondDict[num]) {
    return secondDict[num];
  }
  //handle nums between 0 and 10
  if (0 < num && num < 10) {
    return `oh ${oneToNine[num]}`;
  }
  //handle rest: first convert back to string to split into 2 parts
  const firstNumStr = num.toString().split("")[0];
  const secondNumStr = num.toString().split("")[1];

  //based on firstNumStr, get correct first part of middle word string (e.g twenty, thirty, etc)
  const firsPartOfMiddle = secondDict[Number(`${firstNumStr}0`)];
  //based on secondNumStr, get correct second part of middle word string (e.g. one, two, three, etc)
  const secondPartOfMiddle = oneToNine[Number(secondNumStr)];

  return `${firsPartOfMiddle} ${secondPartOfMiddle}`;
}

module.exports = timeWord;
