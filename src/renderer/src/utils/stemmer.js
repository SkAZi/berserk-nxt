// Russian stemmer
// released under GNU GPL 2.0 or later
// based on Russian Javascript stemmer from Urim project (http://code.google.com/p/urim/ Mozilla Public License 1.1), which is based on Snowball project (http://snowball.tartarus.org)

//
// Example
//
// var testStemmer = new RussianStemmer();
// testStemmer.setCurrent('Википедия');
// var res = testStemmer.getCurrent(); // res == 'Википед'
//

function Among(s, substring_i, result, method) {
  if ((!s && s != "") || (!substring_i && (substring_i != 0)) || !result)
    throw ("Bad Among initialisation: s:" + s + ", substring_i: "
				+ substring_i + ", result: " + result);
  this.s_size = s.length;
  this.s = this.toCharArray(s);
  this.substring_i = substring_i;
  this.result = result;
  this.method = method;
}
Among.prototype.toCharArray = function(s) {
  var sLength = s.length;
  var charArr = new Array(sLength);
  for (var i = 0; i < sLength; i++)
    charArr[i] = s.charCodeAt(i);
  return charArr;
}

function SnowballProgram() {
  var current;
  return {
    bra : 0,
    ket : 0,
    limit : 0,
    cursor : 0,
    limit_backward : 0,
    setCurrent : function(word) {
      current = word;
      this.cursor = 0;
      this.limit = word.length;
      this.limit_backward = 0;
      this.bra = this.cursor;
      this.ket = this.limit;
      },
    getCurrent : function() {
      var result = current;
      current = null;
      return result;
      },
    in_grouping : function(s, min, max) {
      if (this.cursor >= this.limit)
        return false;
      var ch = current.charCodeAt(this.cursor);
      if (ch > max || ch < min)
        return false;
      ch -= min;
      if ((s[ch >> 3] & (0X1 << (ch & 0X7))) == 0)
        return false;
      this.cursor++;
      return true;
      },
    in_grouping_b : function(s, min, max) {
      if (this.cursor <= this.limit_backward)
        return false;
      var ch = current.charCodeAt(this.cursor - 1);
      if (ch > max || ch < min)
        return false;
      ch -= min;
      if ((s[ch >> 3] & (0X1 << (ch & 0X7))) == 0)
        return false;
      this.cursor--;
      return true;
      },
    out_grouping : function(s, min, max) {
      if (this.cursor >= this.limit)
        return false;
      var ch = current.charCodeAt(this.cursor);
      if (ch > max || ch < min) {
        this.cursor++;
        return true;
      }
      ch -= min;
      if ((s[ch >> 3] & (0X1 << (ch & 0X7))) == 0) {
        this.cursor++;
        return true;
      }
      return false;
      },
    out_grouping_b : function(s, min, max) {
      if (this.cursor <= this.limit_backward)
        return false;
      var ch = current.charCodeAt(this.cursor - 1);
      if (ch > max || ch < min) {
        this.cursor--;
        return true;
      }
      ch -= min;
      if ((s[ch >> 3] & (0X1 << (ch & 0X7))) == 0) {
        this.cursor--;
        return true;
      }
      return false;
      },
    in_range : function(min, max) {
      if (this.cursor >= this.limit)
        return false;
      var ch = current.charCodeAt(this.cursor);
      if (ch > max || ch < min)
        return false;
      this.cursor++;
      return true;
      },
    in_range_b : function(min, max) {
      if (this.cursor <= this.limit_backward)
        return false;
      var ch = current.charCodeAt(this.cursor - 1);
      if (ch > max || ch < min)
        return false;
      this.cursor--;
      return true;
      },
    out_range : function(min, max) {
      if (this.cursor >= this.limit)
        return false;
      var ch = current.charCodeAt(this.cursor);
      if (!(ch > max || ch < min))
        return false;
      this.cursor++;
      return true;
      },
    out_range_b : function(min, max) {
      if (this.cursor <= this.limit_backward)
        return false;
      var ch = current.charCodeAt(this.cursor - 1);
      if (!(ch > max || ch < min))
        return false;
      this.cursor--;
      return true;
      },
    eq_s : function(s_size, s) {
      if (this.limit - this.cursor < s_size)
        return false;
      for (var i = 0; i != s_size; i++) {
        if (current.charCodeAt(this.cursor + i) != s.charCodeAt(i))
          return false;
      }
      this.cursor += s_size;
      return true;
      },
    eq_s_b : function(s_size, s) {
      if (this.cursor - this.limit_backward < s_size)
        return false;
      for (var i = 0; i != s_size; i++) {
        if (current.charCodeAt(this.cursor - s_size + i) != s
						.charCodeAt(i))
          return false;
      }
      this.cursor -= s_size;
      return true;
      },
    find_among : function(v, v_size) {
      var i = 0;
      var j = v_size;
      var c = this.cursor;
      var l = this.limit;
      var common_i = 0;
      var common_j = 0;
      var first_key_inspected = false;
      while (true) {
        var k = i + ((j - i) >> 1);
        var diff = 0;
        var common = common_i < common_j ? common_i : common_j;
        var w = v[k];
        for (var i2 = common; i2 < w.s_size; i2++) {
          if (c + common == l) {
            diff = -1;
            break;
          }
          diff = current.charCodeAt(c + common) - w.s[i2];
          if (diff != 0)
            break;
          common++;
        }
        if (diff < 0) {
          j = k;
          common_j = common;
        } else {
          i = k;
          common_i = common;
        }
        if (j - i <= 1) {
          if (i > 0)
            break;
          if (j == i)
            break;
          if (first_key_inspected)
            break;
          first_key_inspected = true;
        }
      }
      while (true) {
        var w = v[i];
        if (common_i >= w.s_size) {
          this.cursor = c + w.s_size;
          if (!w.method)
            return w.result;
          var res = w.method();
          this.cursor = c + w.s_size;
          if (res)
            return w.result;
        }
        i = w.substring_i;
        if (i < 0)
          return 0;
      }
    },
    find_among_b : function(v, v_size) {
      var i = 0;
      var j = v_size;
      var c = this.cursor;
      var lb = this.limit_backward;
      var common_i = 0;
      var common_j = 0;
      var first_key_inspected = false;
      while (true) {
        var k = i + ((j - i) >> 1);
        var diff = 0;
        var common = common_i < common_j ? common_i : common_j;
        var w = v[k];
        for (var i2 = w.s_size - 1 - common; i2 >= 0; i2--) {
          if (c - common == lb) {
            diff = -1;
            break;
          }
          diff = current.charCodeAt(c - 1 - common) - w.s[i2];
          if (diff != 0)
            break;
          common++;
        }
        if (diff < 0) {
          j = k;
          common_j = common;
        } else {
          i = k;
          common_i = common;
        }
        if (j - i <= 1) {
          if (i > 0)
            break;
          if (j == i)
            break;
          if (first_key_inspected)
            break;
          first_key_inspected = true;
        }
      }
      while (true) {
        var w = v[i];
        if (common_i >= w.s_size) {
          this.cursor = c - w.s_size;
          if (!w.method)
            return w.result;
          var res = w.method();
          this.cursor = c - w.s_size;
          if (res)
            return w.result;
        }
        i = w.substring_i;
        if (i < 0)
          return 0;
      }
    },
    replace_s : function(c_bra, c_ket, s) {
      var adjustment = s.length - (c_ket - c_bra);
      var left = current.substring(0, c_bra);
      var right = current.substring(c_ket);
      current = left + s + right;
      this.limit += adjustment;
      if (this.cursor >= c_ket)
        this.cursor += adjustment;
      else if (this.cursor > c_bra)
        this.cursor = c_bra;
      return adjustment;
      },
    slice_check : function() {
      if (this.bra < 0 || this.bra > this.ket || this.ket > this.limit
					|| this.limit > current.length) {
        throw ("faulty slice operation");
      }
    },
    slice_from : function(s) {
      this.slice_check();
      this.replace_s(this.bra, this.ket, s);
      },
    slice_del : function() {
      this.slice_from("");
      },
    insert : function(c_bra, c_ket, s) {
      var adjustment = this.replace_s(c_bra, c_ket, s);
      if (c_bra <= this.bra)
        this.bra += adjustment;
      if (c_bra <= this.ket)
        this.ket += adjustment;
      },
    slice_to : function() {
      this.slice_check();
      return current.substring(this.bra, this.ket);
      },
    eq_v_b : function(s) {
      return this.eq_s_b(s.length, s);
    }
  };
}

function RussianStemmer() {
  var a_0 = [new Among("\u0432", -1, 1), new Among("\u0438\u0432", 0, 2),
             new Among("\u044B\u0432", 0, 2),
             new Among("\u0432\u0448\u0438", -1, 1),
             new Among("\u0438\u0432\u0448\u0438", 3, 2),
             new Among("\u044B\u0432\u0448\u0438", 3, 2),
             new Among("\u0432\u0448\u0438\u0441\u044C", -1, 1),
             new Among("\u0438\u0432\u0448\u0438\u0441\u044C", 6, 2),
             new Among("\u044B\u0432\u0448\u0438\u0441\u044C", 6, 2)];
  var a_1 = [new Among("\u0435\u0435", -1, 1),
             new Among("\u0438\u0435", -1, 1), new Among("\u043E\u0435", -1, 1),
             new Among("\u044B\u0435", -1, 1),
             new Among("\u0438\u043C\u0438", -1, 1),
             new Among("\u044B\u043C\u0438", -1, 1),
             new Among("\u0435\u0439", -1, 1), new Among("\u0438\u0439", -1, 1),
             new Among("\u043E\u0439", -1, 1), new Among("\u044B\u0439", -1, 1),
             new Among("\u0435\u043C", -1, 1), new Among("\u0438\u043C", -1, 1),
             new Among("\u043E\u043C", -1, 1), new Among("\u044B\u043C", -1, 1),
             new Among("\u0435\u0433\u043E", -1, 1),
             new Among("\u043E\u0433\u043E", -1, 1),
             new Among("\u0435\u043C\u0443", -1, 1),
             new Among("\u043E\u043C\u0443", -1, 1),
             new Among("\u0438\u0445", -1, 1), new Among("\u044B\u0445", -1, 1),
             new Among("\u0435\u044E", -1, 1), new Among("\u043E\u044E", -1, 1),
             new Among("\u0443\u044E", -1, 1), new Among("\u044E\u044E", -1, 1),
             new Among("\u0430\u044F", -1, 1), new Among("\u044F\u044F", -1, 1)];
  var a_2 = [new Among("\u0435\u043C", -1, 1),
             new Among("\u043D\u043D", -1, 1), new Among("\u0432\u0448", -1, 1),
             new Among("\u0438\u0432\u0448", 2, 2),
             new Among("\u044B\u0432\u0448", 2, 2), new Among("\u0449", -1, 1),
             new Among("\u044E\u0449", 5, 1),
             new Among("\u0443\u044E\u0449", 6, 2)]
  var a_3 = [new Among("\u0441\u044C", -1, 1),
             new Among("\u0441\u044F", -1, 1)];
  var a_4 = [new Among("\u043B\u0430", -1, 1),
             new Among("\u0438\u043B\u0430", 0, 2),
             new Among("\u044B\u043B\u0430", 0, 2),
             new Among("\u043D\u0430", -1, 1),
             new Among("\u0435\u043D\u0430", 3, 2),
             new Among("\u0435\u0442\u0435", -1, 1),
             new Among("\u0438\u0442\u0435", -1, 2),
             new Among("\u0439\u0442\u0435", -1, 1),
             new Among("\u0435\u0439\u0442\u0435", 7, 2),
             new Among("\u0443\u0439\u0442\u0435", 7, 2),
             new Among("\u043B\u0438", -1, 1),
             new Among("\u0438\u043B\u0438", 10, 2),
             new Among("\u044B\u043B\u0438", 10, 2), new Among("\u0439", -1, 1),
             new Among("\u0435\u0439", 13, 2), new Among("\u0443\u0439", 13, 2),
             new Among("\u043B", -1, 1), new Among("\u0438\u043B", 16, 2),
             new Among("\u044B\u043B", 16, 2), new Among("\u0435\u043C", -1, 1),
             new Among("\u0438\u043C", -1, 2), new Among("\u044B\u043C", -1, 2),
             new Among("\u043D", -1, 1), new Among("\u0435\u043D", 22, 2),
             new Among("\u043B\u043E", -1, 1),
             new Among("\u0438\u043B\u043E", 24, 2),
             new Among("\u044B\u043B\u043E", 24, 2),
             new Among("\u043D\u043E", -1, 1),
             new Among("\u0435\u043D\u043E", 27, 2),
             new Among("\u043D\u043D\u043E", 27, 1),
             new Among("\u0435\u0442", -1, 1),
             new Among("\u0443\u0435\u0442", 30, 2),
             new Among("\u0438\u0442", -1, 2), new Among("\u044B\u0442", -1, 2),
             new Among("\u044E\u0442", -1, 1),
             new Among("\u0443\u044E\u0442", 34, 2),
             new Among("\u044F\u0442", -1, 2), new Among("\u043D\u044B", -1, 1),
             new Among("\u0435\u043D\u044B", 37, 2),
             new Among("\u0442\u044C", -1, 1),
             new Among("\u0438\u0442\u044C", 39, 2),
             new Among("\u044B\u0442\u044C", 39, 2),
             new Among("\u0435\u0448\u044C", -1, 1),
             new Among("\u0438\u0448\u044C", -1, 2), new Among("\u044E", -1, 2),
             new Among("\u0443\u044E", 44, 2)];
  var a_5 = [new Among("\u0430", -1, 1), new Among("\u0435\u0432", -1, 1),
             new Among("\u043E\u0432", -1, 1), new Among("\u0435", -1, 1),
             new Among("\u0438\u0435", 3, 1), new Among("\u044C\u0435", 3, 1),
             new Among("\u0438", -1, 1), new Among("\u0435\u0438", 6, 1),
             new Among("\u0438\u0438", 6, 1),
             new Among("\u0430\u043C\u0438", 6, 1),
             new Among("\u044F\u043C\u0438", 6, 1),
             new Among("\u0438\u044F\u043C\u0438", 10, 1),
             new Among("\u0439", -1, 1), new Among("\u0435\u0439", 12, 1),
             new Among("\u0438\u0435\u0439", 13, 1),
             new Among("\u0438\u0439", 12, 1), new Among("\u043E\u0439", 12, 1),
             new Among("\u0430\u043C", -1, 1), new Among("\u0435\u043C", -1, 1),
             new Among("\u0438\u0435\u043C", 18, 1),
             new Among("\u043E\u043C", -1, 1), new Among("\u044F\u043C", -1, 1),
             new Among("\u0438\u044F\u043C", 21, 1), new Among("\u043E", -1, 1),
             new Among("\u0443", -1, 1), new Among("\u0430\u0445", -1, 1),
             new Among("\u044F\u0445", -1, 1),
             new Among("\u0438\u044F\u0445", 26, 1), new Among("\u044B", -1, 1),
             new Among("\u044C", -1, 1), new Among("\u044E", -1, 1),
             new Among("\u0438\u044E", 30, 1), new Among("\u044C\u044E", 30, 1),
             new Among("\u044F", -1, 1), new Among("\u0438\u044F", 33, 1),
             new Among("\u044C\u044F", 33, 1)];
  var a_6 = [new Among("\u043E\u0441\u0442", -1, 1),
             new Among("\u043E\u0441\u0442\u044C", -1, 1)];
  var a_7 = [new Among("\u0435\u0439\u0448\u0435", -1, 1),
             new Among("\u043D", -1, 2), new Among("\u0435\u0439\u0448", -1, 1),
             new Among("\u044C", -1, 3)];
  var g_v = [33, 65, 8, 232];
  var I_p2, I_pV;
  // @ts-ignore
  var sbp = new SnowballProgram();
  this.setCurrent = function(word) {
    sbp.setCurrent(word);
  };
  this.getCurrent = function() {
    return sbp.getCurrent();
  };
  function r_mark_regions() {
    var v_1;
    I_pV = sbp.limit;
    I_p2 = sbp.limit;
    v_1 = sbp.cursor;
    lab0 : do {
      golab1 : while (true) {
        lab2 : do {
          if (!(sbp.in_grouping(g_v, 1072, 1103))) {
            break lab2;
          }
          break golab1;
        } while (false);
        if (sbp.cursor >= sbp.limit) {
          break lab0;
        }
        sbp.cursor++;
      }
      I_pV = sbp.cursor;
      golab3 : while (true) {
        lab4 : do {
          if (!(sbp.out_grouping(g_v, 1072, 1103))) {
            break lab4;
          }
          break golab3;
        } while (false);
        if (sbp.cursor >= sbp.limit) {
          break lab0;
        }
        sbp.cursor++;
      }
      golab5 : while (true) {
        lab6 : do {
          if (!(sbp.in_grouping(g_v, 1072, 1103))) {
            break lab6;
          }
          break golab5;
        } while (false);
        if (sbp.cursor >= sbp.limit) {
          break lab0;
        }
        sbp.cursor++;
      }
      golab7 : while (true) {
        lab8 : do {
          if (!(sbp.out_grouping(g_v, 1072, 1103))) {
            break lab8;
          }
          break golab7;
        } while (false);
        if (sbp.cursor >= sbp.limit) {
          break lab0;
        }
        sbp.cursor++;
      }
      I_p2 = sbp.cursor;
    } while (false);
    sbp.cursor = v_1;
    return true;
  }
  function r_R2() {
    if (!(I_p2 <= sbp.cursor)) {
      return false;
    }
    return true;
  }
  function r_perfective_gerund() {
    var among_var;
    var v_1;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_0, 9);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          lab0 : do {
            v_1 = sbp.limit - sbp.cursor;
            lab1 : do {
              if (!(sbp.eq_s_b(1, "\u0430"))) {
                break lab1;
              }
              break lab0;
            } while (false);
            sbp.cursor = sbp.limit - v_1;
            if (!(sbp.eq_s_b(1, "\u044F"))) {
              return false;
            }
          } while (false);
          sbp.slice_del();
          break;
          case 2 :
            sbp.slice_del();
            break;
    }
    return true;
  }
  function r_adjective() {
    var among_var;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_1, 26);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          sbp.slice_del();
          break;
    }
    return true;
  }
  function r_adjectival() {
    var among_var;
    var v_1;
    var v_2;
    if (!r_adjective()) {
      return false;
    }
    v_1 = sbp.limit - sbp.cursor;
    lab0 : do {
      sbp.ket = sbp.cursor;
      among_var = sbp.find_among_b(a_2, 8);
      if (among_var == 0) {
        sbp.cursor = sbp.limit - v_1;
        break lab0;
      }
      sbp.bra = sbp.cursor;
      switch (among_var) {
        case 0 :
          sbp.cursor = sbp.limit - v_1;
          break lab0;
          case 1 :
            lab1 : do {
              v_2 = sbp.limit - sbp.cursor;
              lab2 : do {
                if (!(sbp.eq_s_b(1, "\u0430"))) {
                  break lab2;
                }
                break lab1;
              } while (false);
              sbp.cursor = sbp.limit - v_2;
              if (!(sbp.eq_s_b(1, "\u044F"))) {
                sbp.cursor = sbp.limit - v_1;
                break lab0;
              }
            } while (false);
            sbp.slice_del();
            break;
            case 2 :
              sbp.slice_del();
              break;
      }
    } while (false);
    return true;
  }
  function r_reflexive() {
    var among_var;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_3, 2);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          sbp.slice_del();
          break;
    }
    return true;
  }
  function r_verb() {
    var among_var;
    var v_1;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_4, 46);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          lab0 : do {
            v_1 = sbp.limit - sbp.cursor;
            lab1 : do {
              if (!(sbp.eq_s_b(1, "\u0430"))) {
                break lab1;
              }
              break lab0;
            } while (false);
            sbp.cursor = sbp.limit - v_1;
            if (!(sbp.eq_s_b(1, "\u044F"))) {
              return false;
            }
          } while (false);
          sbp.slice_del();
          break;
          case 2 :
            sbp.slice_del();
            break;
    }
    return true;
  }
  function r_noun() {
    var among_var;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_5, 36);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          sbp.slice_del();
          break;
    }
    return true;
  }
  function r_derivational() {
    var among_var;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_6, 2);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    if (!r_R2()) {
      return false;
    }
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          sbp.slice_del();
          break;
    }
    return true;
  }
  function r_tidy_up() {
    var among_var;
    sbp.ket = sbp.cursor;
    among_var = sbp.find_among_b(a_7, 4);
    if (among_var == 0) {
      return false;
    }
    sbp.bra = sbp.cursor;
    switch (among_var) {
      case 0 :
        return false;
        case 1 :
          sbp.slice_del();
          sbp.ket = sbp.cursor;
          if (!(sbp.eq_s_b(1, "\u043D"))) {
            return false;
          }
				sbp.bra = sbp.cursor;
          if (!(sbp.eq_s_b(1, "\u043D"))) {
            return false;
          }
				sbp.slice_del();
          break;
          case 2 :
            if (!(sbp.eq_s_b(1, "\u043D"))) {
              return false;
            }
				sbp.slice_del();
            break;
            case 3 :
              sbp.slice_del();
              break;
    }
    return true;
  }
  this.stem = function() {
    var v_1, v_2, v_3, v_4, v_5, v_6, v_7, v_8, v_9, v_10;
    v_1 = sbp.cursor;
    lab0 : do {
      if (!r_mark_regions()) {
        break lab0;
      }
    } while (false);
    sbp.cursor = v_1;
    sbp.limit_backward = sbp.cursor;
    sbp.cursor = sbp.limit;
    v_2 = sbp.limit - sbp.cursor;
    if (sbp.cursor < I_pV) {
      return false;
    }
    sbp.cursor = I_pV;
    v_3 = sbp.limit_backward;
    sbp.limit_backward = sbp.cursor;
    sbp.cursor = sbp.limit - v_2;
    v_4 = sbp.limit - sbp.cursor;
    lab1 : do {
      lab2 : do {
        v_5 = sbp.limit - sbp.cursor;
        lab3 : do {
          if (!r_perfective_gerund()) {
            break lab3;
          }
          break lab2;
        } while (false);
        sbp.cursor = sbp.limit - v_5;
        v_6 = sbp.limit - sbp.cursor;
        lab4 : do {
          if (!r_reflexive()) {
            sbp.cursor = sbp.limit - v_6;
            break lab4;
          }
        } while (false);
        lab5 : do {
          v_7 = sbp.limit - sbp.cursor;
          lab6 : do {
            if (!r_adjectival()) {
              break lab6;
            }
            break lab5;
          } while (false);
          sbp.cursor = sbp.limit - v_7;
          lab7 : do {
            if (!r_verb()) {
              break lab7;
            }
            break lab5;
          } while (false);
          sbp.cursor = sbp.limit - v_7;
          if (!r_noun()) {
            break lab1;
          }
        } while (false);
      } while (false);
    } while (false);
    sbp.cursor = sbp.limit - v_4;
    v_8 = sbp.limit - sbp.cursor;
    lab8 : do {
      sbp.ket = sbp.cursor;
      if (!(sbp.eq_s_b(1, "\u0438"))) {
        sbp.cursor = sbp.limit - v_8;
        break lab8;
      }
      sbp.bra = sbp.cursor;
      sbp.slice_del();
    } while (false);
    v_9 = sbp.limit - sbp.cursor;
    lab9 : do {
      if (!r_derivational()) {
        break lab9;
      }
    } while (false);
    sbp.cursor = sbp.limit - v_9;
    v_10 = sbp.limit - sbp.cursor;
    lab10 : do {
      if (!r_tidy_up()) {
        break lab10;
      }
    } while (false);
    sbp.cursor = sbp.limit - v_10;
    sbp.limit_backward = v_3;
    sbp.cursor = sbp.limit_backward;
    return true;
  }
}

const stop_words = new Set(['и', 'в', 'во', 'не', 'что', 'он', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к',
  'у', 'же', 'вы', 'за', 'бы', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'даже',
  'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам',
  'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя',
  'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'ж', 'тогда', 'кто', 'этот',
  'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее',
  'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после',
  'над', 'больше', 'тот', 'эти', 'нас', 'про', 'них', 'какая', 'много', 'разве', 'эту', 'моя', 'впрочем', 'хорошо', 'свою',
  'этой', 'иногда', 'лучше', 'чуть', 'том', 'такой', 'им', 'более', 'конечно', 'всю'])
  
const stemmer = new RussianStemmer();

function stem(token) {
  if(stop_words.has(token)) return []
  stemmer.setCurrent(token)
  stemmer.stem()
  return stemmer.getCurrent()
}

export function tokenizer(query){
  return (query || "").toLowerCase().replace('ё','е').replace(/[.,\/!$%\^&\*;:{}=_`~()]/g, "").split(/\s+/).flatMap((slug) => {
    return (slug == "#") ? (slug.length > 4 ? "#" + stem(slug.slice(1)) : slug) : stem(slug)
  });
}
