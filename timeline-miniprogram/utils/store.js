/**
 * 本地数据层：需求草稿 / 时间线记录
 * 数据全部存在 Storage，换设备不同步（如需云同步可替换这里）
 */
const KEY_RECORDS = 'tl_records_v1'
const KEY_DRAFT = 'tl_draft_v1'
const KEY_GOALS = 'tl_goals_v1'
const KEY_MSGS = 'tl_msgs_v1'

function getRecords() {
  try {
    const list = wx.getStorageSync(KEY_RECORDS)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function setRecords(list) {
  try {
    wx.setStorageSync(KEY_RECORDS, list)
  } catch (e) {
    wx.showToast({ title: '本地存储写入失败', icon: 'none' })
  }
}

function addRecord(record) {
  const list = getRecords()
  list.unshift(record)
  setRecords(list)
  return record
}

function getRecord(id) {
  return getRecords().filter(function (r) {
    return r.id === id
  })[0]
}

function updateRecord(id, updater) {
  const list = getRecords()
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      updater(list[i])
      setRecords(list)
      return list[i]
    }
  }
  return null
}

function toggleTask(recordId, taskId) {
  return updateRecord(recordId, function (r) {
    r.tasks.forEach(function (t) {
      if (t.id === taskId) {
        t.done = !t.done
        t.doneAt = t.done ? Date.now() : 0
      }
    })
  })
}

function removeRecord(id) {
  setRecords(
    getRecords().filter(function (r) {
      return r.id !== id
    })
  )
}

function clearAll() {
  setRecords([])
}

/* ------------------------------ 目标 ------------------------------ */

function getGoals() {
  try {
    const list = wx.getStorageSync(KEY_GOALS)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function setGoals(list) {
  try {
    wx.setStorageSync(KEY_GOALS, list)
  } catch (e) {}
}

function addGoal(goal) {
  const list = getGoals()
  list.unshift(goal)
  setGoals(list)
  return goal
}

function getGoal(id) {
  return getGoals().filter(function (g) {
    return g.id === id
  })[0]
}

function updateGoal(id, updater) {
  const list = getGoals()
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      updater(list[i])
      setGoals(list)
      return list[i]
    }
  }
  return null
}

function removeGoal(id) {
  setGoals(
    getGoals().filter(function (g) {
      return g.id !== id
    })
  )
  // 同时清掉时间线上属于它的记录
  setRecords(
    getRecords().filter(function (r) {
      return r.goalId !== id
    })
  )
}

/* ------------------------------ 会话 ------------------------------ */

function getMessages() {
  try {
    const list = wx.getStorageSync(KEY_MSGS)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function addMessage(msg) {
  const list = getMessages()
  list.unshift(msg)
  if (list.length > 60) list.length = 60
  try {
    wx.setStorageSync(KEY_MSGS, list)
  } catch (e) {}
  return msg
}

function updateMessage(id, updater) {
  const list = getMessages()
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      updater(list[i])
      try {
        wx.setStorageSync(KEY_MSGS, list)
      } catch (e) {}
      return list[i]
    }
  }
  return null
}

/* ------------------------------ 草稿 ------------------------------ */

function saveDraft(text) {
  const draft = { text: text, updatedAt: Date.now() }
  try {
    wx.setStorageSync(KEY_DRAFT, draft)
  } catch (e) {}
  return draft
}

function getDraft() {
  try {
    return wx.getStorageSync(KEY_DRAFT) || null
  } catch (e) {
    return null
  }
}

module.exports = {
  setRecords: setRecords,
  getGoals: getGoals,
  setGoals: setGoals,
  addGoal: addGoal,
  getGoal: getGoal,
  updateGoal: updateGoal,
  removeGoal: removeGoal,
  getMessages: getMessages,
  addMessage: addMessage,
  updateMessage: updateMessage,
  getRecords: getRecords,
  addRecord: addRecord,
  getRecord: getRecord,
  updateRecord: updateRecord,
  toggleTask: toggleTask,
  removeRecord: removeRecord,
  clearAll: clearAll,
  saveDraft: saveDraft,
  getDraft: getDraft
}
