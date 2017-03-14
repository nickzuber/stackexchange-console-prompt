'use strict';

const fs = require('fs');
const Xray = require('x-ray');
const vDOM = require('jsdom');
const chalk = require('chalk');
const colors = require('colors/safe');
const x = Xray();

const currentDate = new Date().getTime();
const FILE_WITH_DATA = __dirname + '/data.txt';

const QUESTION_SELECTOR = '#question-list .question-container .question-hot';
const QUESTION_TITLE_SELECTOR = '#question-list .question-container .question-hot h2 a';
const QUESTION_GROUP_SELECTOR = '#question-list .question-container .question-hot .metaInfo .question-host';
const MILLISECONDS_IN_A_DAY = 86400000;

fs.readFile(FILE_WITH_DATA, 'utf8', function (err, data) {
  if (err) throw new Error(err);
  const json = JSON.parse(data);

  // If we haven't refreshed in over a day
  if (currentDate - json.timestamp > MILLISECONDS_IN_A_DAY) {
    // console.log(colors.red(`Last updated ${getTimeMessage(currentDate - json.timestamp)} ago.`));
    console.log(colors.black('Fetching new questions...'));
    rehydrateHotQuestions();
    return;
  }
  printRandomQuestionFromFile(json);
});

function getTimeMessage (timeInMilliseconds) {
  const timeInSeconds = timeInMilliseconds / 1000;
  const MINUTE = 60;
  const HOUR = 60 * 60;

  // Within a few seconds
  if (timeInSeconds < 15) return 'a few seconds ago';
  // Less than a minute
  if (timeInSeconds < MINUTE) return 'less than a minute';
  // Only a few minutes
  if (timeInSeconds < 15 * MINUTE) return 'a few minutes';
  // Less than an hour
  if (timeInSeconds < HOUR) return 'less than an hour';
  // Single hour
  if (timeInSeconds < 2 * HOUR) return 'an hour';

  const timeInHours = Math.round(timeInSeconds / (HOUR));

  // Multiple hours
  if (timeInSeconds < 24 * HOUR) return `${timeInHours} hours`;

  // Over a day (shouldn't get past this point really too often)
  return `over a day`;
}

function printRandomQuestionFromFile (json) {
  const rand = getRandomArbitrary(0, json.questions.length);
  const randomQuestion = json.questions[rand];
  console.log(colors.black(`Question ${rand} out of ${json.questions.length} — Last updated ${getTimeMessage(currentDate - json.timestamp)} ago.`))
  console.log(colors.green.bold('📚  ' + randomQuestion.title)
            + colors.yellow(' — '+randomQuestion.group) + '\n'
            + colors.gray('chrome ')
            + colors.blue.underline(randomQuestion.link));
}

function rehydrateHotQuestions () {
  const resObj = {
    timestamp: currentDate,
    questions: null
  };

  x('http://stackexchange.com/?pagesize=50&page=1', 'body@html')
  (function(err, data) {
    if (err) throw new Error(err);
    vDOM.env(
      data,
      function (err, window) {
        if (err) throw new Error(err);

        const questionObjects = [];
        const hotQuestionCount = window.document.querySelectorAll(QUESTION_SELECTOR).length;

        for (let i = 0; i < hotQuestionCount; ++i) {
          let qObj = {};
          qObj.group = window.document.querySelectorAll(QUESTION_GROUP_SELECTOR)[i].innerHTML.trim()
          qObj.title = window.document.querySelectorAll(QUESTION_TITLE_SELECTOR)[i].innerHTML.trim();
          qObj.link = window.document.querySelectorAll(QUESTION_TITLE_SELECTOR)[i].href.trim();
          questionObjects.push(qObj);
        }

        resObj.questions = questionObjects;
        collectLastPage(resObj);
      }
    );
  });
}

function collectLastPage (resObj) {
  x('http://stackexchange.com/?pagesize=50&page=2', 'body@html')
  (function(err, data) {
    if (err) throw new Error(err);
    vDOM.env(
      data,
      function (err, window) {
        if (err) throw new Error(err);

        const questionObjects = [];
        const hotQuestionCount = window.document.querySelectorAll(QUESTION_SELECTOR).length;

        for (let i = 0; i < hotQuestionCount; ++i) {
          let qObj = {};
          qObj.group = window.document.querySelectorAll(QUESTION_GROUP_SELECTOR)[i].innerHTML.trim()
          qObj.title = window.document.querySelectorAll(QUESTION_TITLE_SELECTOR)[i].innerHTML.trim();
          qObj.link = window.document.querySelectorAll(QUESTION_TITLE_SELECTOR)[i].href.trim();
          questionObjects.push(qObj);
        }

        resObj.questions = resObj.questions.concat(questionObjects);
        writeToFile(resObj);
      }
    );
  });
}

function writeToFile (resObj) {
  fs.writeFile(FILE_WITH_DATA, JSON.stringify(resObj), function (err) {
    if (err) throw new Error(err);
    printRandomQuestionFromFile(resObj);
  });
}

function getRandomArbitrary (min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
