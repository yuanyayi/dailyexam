// 基本设置：
if (!window.userId) {
  window.userId = '';
}

function postUserIdStr(str) {
  window.userId = str;
}
// 如果获取到userId，则清除计时器，开始主流程
var getUserIdtimer = setInterval(function() {
  if (!!window.getappuserid) {
    clearInterval(getUserIdtimer);
    window.getappuserid.getUserID();
    main();
  }
}, 100);
// 3秒后清除计时器，如果userId为空，则置入默认值，开始主流程
setTimeout(function() {
  clearInterval(getUserIdtimer);
  if (window.userId == '') {
    window.userId = "201708071511258138685280";
    // window.userId="48931";
    main();
  }
}, 1500);
// 主进程：
function main() {
  $("#app").show();
  var post_url = "http://api.platform.winlesson.com";
  var url = {
    "subjects": post_url + "/day/exam/subjects", //测试
    "submit": post_url + "/day/exam/subject/submit", //提交
    "rank": post_url + "/day/exam/subject/rank", //排名
  }
  var numbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  var global_var = {};
  var today = new Date();

  function getRank() {
    $.ajax({
      url: url.rank + "?userid=" + userId + "&timestamp=" + new Date().getTime(),
      type: 'get',
      success: function(res) {
        if (res.code == 200) {
          // 置入排名列表
          app.rankList = res.ranks;
          // 获取当前用户名次信息
          app.userInfo = res.my_rank;
          // app.userInfo.rank = 'x';
          app.total_user = res.total_user;
        }
      }
    });
  }
  // 获取题目：
  $.ajax({
    url: url.subjects + "?userid=" + userId,
    type: "get",
    success: function(res) {
      if (res.code == 200) {
        // 数据处理：
        window.tempQ = JSON.parse(JSON.stringify(res.subjects));
        window.paper = { "paperId": res.paper_id, "paperTypeId": res.subjects[0].paperTypeId };
      }
    }
  });
  // 创建根实例：
  var app = new Vue({
    el: '#app',
    data: {
      page: 'rank', // test | rank | answer
      paperId: 0,
      paperTypeId: 0,
      month: today.getMonth() + 1 + '月',
      day: today.getDate(),
      questions: [],
      rankList: [],
      total_user: 0,
      userId: userId,
      userInfo: {
        user: {},
      },
      userPoint: '00',
      done: 0,
    },
    beforeCreate: getRank(),
    methods: {
      'goToPage': function(type) {
        if (!isNaN(this.userInfo.rank)) {
          this.done += 1;
        }
        if (type == "test" && this.done) {
          this.page = "answer";
          console.log(this.done);
          return false;
        } else if (type == "rank") {
          getRank();
        }
        this.page = type;
        document.body.scrollTop = 0;
        return true;
      },
      'getQuestions': function() {
        if (!app.goToPage()) return false;
        this.questions = window.tempQ;
        this.goToPage("test");
        this.userPoint = '00';
        window.startTime = new Date();
      },
      'postAnswer': function() {
        window.endTime = new Date();
        var usingTime = endTime - startTime;
        // 总数据打包：
        var data = {
          userid: userId,
          pager_id: paper.paperId,
          paperResult: {
            "paperTypeId": paper.paperTypeId,
            "answerInfo": [],
            "paperId": paper.paperId,
          },
        };
        // 循环遍历题目
        for (var i = 0; i < this.questions.length; i++) {
          var item = this.questions[i];
          var tempStr_correctItem = '';
          // 顺便处理下用户得分：
          if (item.correctIndexeList.sort().toString() == item.myAnswer.toString()) {
            app.userPoint = parseInt(app.userPoint) + 1;
            app.userPoint = app.userPoint >= 10 ? app.userPoint : '0' + app.userPoint;
          }
          // 处理correctItem:
          if (item.correctItem instanceof Array || item.correctItem instanceof Object) {
            for (var j = 0; j < item.correctItem.length; j++) {
              tempStr_correctItem += (item.correctItem[j] + ',');
            }
          } else {
            tempStr_correctItem = item.correctItem + ",";
          }
          tempStr_correctItem = tempStr_correctItem.slice(0, -1);

          // 处理choseItem:
          var tempStr_choseItem = '';
          if (item.myAnswer == '') {
            tempStr_choseItem = '0,';
          } else {
            for (var j = 0; j < item.selections.length; j++) {
              if (item.myAnswer == item.selections[j].itemIndex) {
                tempStr_choseItem += (item.selections[j].itemId + ',');
              }
            }
          }
          tempStr_choseItem = tempStr_choseItem.slice(0, -1);
          // 时间处理：
          var tempTime = (i == 0 ? parseInt(usingTime / 1000) : 0);
          // 单独问题打包
          data.paperResult["answerInfo"].push({
            "costTime": tempTime,
            "subjectId": item.subjectId,
            "correctItem": tempStr_correctItem,
            "section_code": item.section_code,
            "choseItem": tempStr_choseItem,
          });
        } //for循环遍历题目结束
        data.paperResult = JSON.stringify(data.paperResult);
        // 发送程序：
        $.ajax({
          url: url.submit + "?userid=" + userId,
          data: data,
          type: "post",
          success: function(res) {
            if (res.code == 200) {
              app.goToPage("answer");
              app.done += 1;
            }
          }
        });
      },
    },
    filters: {
      timefilter: function(value) {
        if (!value) return '--:--';
        if (value < 10) return '00:0' + value;
        else if (value < 60) return '00:' + value;
        else if (value < (60 * 60)) {
          if (value % 60 < 10) {
            return parseInt(value / 60) + ":0" + (value % 60);
          }
          return parseInt(value / 60) + ":" + (value % 60);
        } else return '--:--';
      },
      rankfilter: function(value) {
        // console.log(value);
        if (!value || isNaN(parseInt(value)) || value == 0 || value == -1) return '未参与';
        if (value == 1) return '状元';
        else if (value == 2) return '榜眼';
        else if (value == 3) return '探花';
        else return value;
      },
      ifisphonenum: function(value) {
        if (!value) return;
        if (value.toString().length == 11) {
          return value.toString().slice(0, 3) + "****" + value.toString().slice(7)
        }
        return value;
      },
      is_right_num: function(value) {
        if (!value || isNaN(parseInt(value))) return '-';
        else return value;
      }
    },
  });
  // VUE实例化：
  Vue.component('my-question', {
    props: {
      qItem: Object,
      page: String,
      index: Number,
    },
    data() {
      return {
        n: 0,
        numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
      }
    },
    filters: {
      addN: function(value) {
        if (!value) return '';
        if (!window.n) { window.n = 0; }
        if (window.n == value.length) { window.n = 0; }
        window.n += 1;
        return value[window.n - 1];
      },
      notNull: function(value) {
        if (!value) return '-';
        return value;
      }
    },
    template: '<li class="question" :id="\'t\'+index">\
            <h3 v-once>第{{numbers | addN}}题</h3>\
            <div v-show="qItem.materialDecript" class="material">\
              <h5 class="title"></h5>\
              <p v-html="qItem.materialDecript"></p>\
            </div>\
            <div class="content">\
              <p v-html="qItem.subjectDes"></p>\
              <img :src="qItem.qImg">\
            </div>\
            <ul class="selecters">\
              <label v-for="(sItem, index) in qItem.selections" :key="index">\
                <li :class="{ correct: page==\'answer\' && qItem.correctIndexeList.indexOf(sItem.itemIndex)!=-1, wrong: page==\'answer\' && qItem.myAnswer==sItem.itemIndex.toString() && qItem.correctIndexeList.indexOf(sItem.itemIndex)==-1 }" @click="checkItem($event)">\
                  <input type="radio" :id="sItem.itemId" :value="sItem.itemIndex" v-model="qItem.myAnswer" @click.stop class="hidden">\
                  <span class="index"><i>{{sItem.itemIndex}}</i></span><p v-html="sItem.itemDecript"></p>\
                </li>\
              </label>\
            </ul>\
            <div v-if="page===\'answer\'" class="showAnswer">正确答案为:{{qItem.correctIndexeList.toString()}} 您的选择为:{{qItem.myAnswer.toString() | notNull}}</div>\
            <!-- 答案解析 -->\
            <div v-if="page==\'answer\'">\
              <p v-html="qItem.analysis"></p>\
              <footer>\
                <div v-if="qItem.exaPoint" class="type center">{{qItem.exaPoint}}</div>\
                <p v-if="qItem.source">{{qItem.source}}</p>\
              </footer>\
            </div>\
          </li>',
    methods: {
      'checkItem': function(e) {
        var obj = $(e.currentTarget);
        obj.parent().siblings().children().removeClass('cur');
        obj.addClass('cur');
      },
    },
  })
  Vue.component('my-rankcard', {
    props: ['index', 'item'],
    data() {
      return {
        userId: userId,
      }
    },
    filters: {
      timefilter: function(value) {
        if (!value) return '--:--';
        if (value < 10) return '00:0' + value;
        else if (value < 60) return '00:' + value;
        else if (value < (60 * 60)) {
          if (value % 60 < 10) {
            return parseInt(value / 60) + ":0" + (value % 60);
          }
          return parseInt(value / 60) + ":" + (value % 60);
        } else return '--:--';
      },
      ifisphonenum: function(value) {
        if (!value) return;
        if (value.toString().length == 11) {
          return value.toString().slice(0, 3) + "****" + value.toString().slice(7)
        }
        return value;
      }
    },
    template: '<li class="rank-card" :class="{ me: item.user.user_id==userId }">\
          <div v-if="index==0" class="label red">状元</div>\
          <div v-else-if="index==1" class="label red">榜眼</div>\
          <div v-else-if="index==2" class="label red">探花</div>\
          <div v-else class="label">第{{index+1}}名</div>\
          <span class="fr right ta-r">\
              <span class="bold">对<i>{{item.right_num}}</i>题</span>\
              <br/>\
              <span>{{item.use_time | timefilter}}</span>\
          </span>\
          <div class="content row">\
            <span class="portrait">\
              <img :src="item.user.image_url">\
            </span><span class="username">{{item.user.nickname | ifisphonenum}}</span>\
          </div>\
        </li>',
  })
}