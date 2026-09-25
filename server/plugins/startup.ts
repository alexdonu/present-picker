// Runs once when the server starts: opens (and migrates) the database and reports incomplete configuration early.
export default defineNitroPlugin(() => {
  useDb()

  for (const problem of configProblems()) {
    console.error(`[present-picker] Configuration problem: ${problem}. The admin area will not work until it is fixed.`)
  }
})
