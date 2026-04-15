export function fetchAggregateStats(pool, userId) {
  return pool.query(
    `
      WITH per_task AS (
        SELECT task_id, MAX(score) AS best_score
        FROM attempts
        WHERE user_id = $1
        GROUP BY task_id
      ),
      checks AS (
        SELECT
          COUNT(*)::int AS total_checks,
          COALESCE(AVG(score), 0)::numeric(6,2) AS avg_check_score,
          COALESCE(SUM(CASE WHEN score >= 95 THEN 1 ELSE 0 END), 0)::int AS accepted_checks
        FROM attempts
        WHERE user_id = $1
      )
      SELECT
        COUNT(per_task.task_id)::int AS attempted_tasks_count,
        COALESCE(SUM(CASE WHEN per_task.best_score >= 95 THEN 1 ELSE 0 END), 0)::int AS solved_95_count,
        COALESCE(SUM(CASE WHEN per_task.best_score = 100 THEN 1 ELSE 0 END), 0)::int AS flawless_count,
        COALESCE(SUM(CASE WHEN per_task.best_score < 95 THEN 1 ELSE 0 END), 0)::int AS unfinished_count,
        (SELECT total_checks FROM checks)::int AS total_checks,
        COALESCE(AVG(per_task.best_score), 0)::numeric(6,2) AS avg_best_score,
        (SELECT avg_check_score FROM checks)::numeric(6,2) AS avg_check_score,
        COALESCE(100.0 * SUM(CASE WHEN per_task.best_score >= 95 THEN 1 ELSE 0 END) / NULLIF(COUNT(per_task.task_id), 0), 0)::numeric(6,2) AS solved_95_percent,
        COALESCE(100.0 * SUM(CASE WHEN per_task.best_score = 100 THEN 1 ELSE 0 END) / NULLIF(COUNT(per_task.task_id), 0), 0)::numeric(6,2) AS flawless_percent,
        COALESCE(100.0 * SUM(CASE WHEN per_task.best_score < 95 THEN 1 ELSE 0 END) / NULLIF(COUNT(per_task.task_id), 0), 0)::numeric(6,2) AS unfinished_percent,
        COALESCE((SELECT total_checks FROM checks)::numeric / NULLIF(COUNT(per_task.task_id), 0), 0)::numeric(6,2) AS checks_per_task,
        COALESCE(100.0 * (SELECT accepted_checks FROM checks) / NULLIF((SELECT total_checks FROM checks), 0), 0)::numeric(6,2) AS acceptance_percent,
        COALESCE(100.0 * SUM(CASE WHEN per_task.best_score = 100 THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN per_task.best_score >= 95 THEN 1 ELSE 0 END), 0), 0)::numeric(6,2) AS flawless_rate_of_solved,
        COALESCE(SUM(CASE WHEN per_task.best_score < 50 THEN 1 ELSE 0 END), 0)::int AS unfinished_bucket_count,
        COALESCE(SUM(CASE WHEN per_task.best_score >= 50 AND per_task.best_score < 95 THEN 1 ELSE 0 END), 0)::int AS in_progress_bucket_count,
        COALESCE(SUM(CASE WHEN per_task.best_score >= 95 AND per_task.best_score < 100 THEN 1 ELSE 0 END), 0)::int AS solved_bucket_count
      FROM per_task
    `,
    [userId],
  );
}

export function fetchHeatmap(pool, userId) {
  return pool.query(
    `
      WITH days AS (
        SELECT generate_series(
          date_trunc('year', NOW())::date,
          date_trunc('day', NOW())::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      grouped AS (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS c
        FROM attempts
        WHERE user_id = $1
          AND created_at >= date_trunc('year', NOW())
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS day,
        COALESCE(grouped.c, 0)::int AS count
      FROM days
      LEFT JOIN grouped ON grouped.day = days.day
      ORDER BY days.day
    `,
    [userId],
  );
}

export function fetchDailyActivity(pool, userId, activity) {
  if (activity === "year") {
    return pool.query(
      `
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW()) - INTERVAL '11 months',
            date_trunc('month', NOW()),
            INTERVAL '1 month'
          )::date AS month_start
        ),
        per_task_month AS (
          SELECT
            date_trunc('month', created_at)::date AS m,
            task_id,
            MAX(score) AS max_score
          FROM attempts
          WHERE user_id = $1
            AND created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
          GROUP BY 1, 2
        ),
        grouped AS (
          SELECT
            m,
            COUNT(*) FILTER (WHERE max_score < 50)::int AS unfinished,
            COUNT(*) FILTER (WHERE max_score >= 50 AND max_score < 95)::int AS in_progress,
            COUNT(*) FILTER (WHERE max_score >= 95 AND max_score < 100)::int AS solved,
            COUNT(*) FILTER (WHERE max_score = 100)::int AS flawless
          FROM per_task_month
          GROUP BY m
        )
        SELECT
          to_char(months.month_start, 'YYYY-MM') AS day,
          COALESCE(grouped.unfinished, 0) AS unfinished,
          COALESCE(grouped.in_progress, 0) AS in_progress,
          COALESCE(grouped.solved, 0) AS solved,
          COALESCE(grouped.flawless, 0) AS flawless
        FROM months
        LEFT JOIN grouped ON grouped.m = months.month_start
        ORDER BY months.month_start
      `,
      [userId],
    );
  }
  if (activity === "month") {
    return pool.query(
      `
        WITH days AS (
          SELECT generate_series(
            (date_trunc('day', NOW()) - INTERVAL '29 days')::date,
            date_trunc('day', NOW())::date,
            INTERVAL '1 day'
          )::date AS day
        ),
        per_task_day AS (
          SELECT
            date_trunc('day', created_at)::date AS day,
            task_id,
            MAX(score) AS max_score
          FROM attempts
          WHERE user_id = $1
            AND created_at >= (date_trunc('day', NOW()) - INTERVAL '29 days')
          GROUP BY 1, 2
        ),
        grouped AS (
          SELECT
            day,
            COUNT(*) FILTER (WHERE max_score < 50)::int AS unfinished,
            COUNT(*) FILTER (WHERE max_score >= 50 AND max_score < 95)::int AS in_progress,
            COUNT(*) FILTER (WHERE max_score >= 95 AND max_score < 100)::int AS solved,
            COUNT(*) FILTER (WHERE max_score = 100)::int AS flawless
          FROM per_task_day
          GROUP BY day
        )
        SELECT
          to_char(days.day, 'YYYY-MM-DD') AS day,
          COALESCE(grouped.unfinished, 0) AS unfinished,
          COALESCE(grouped.in_progress, 0) AS in_progress,
          COALESCE(grouped.solved, 0) AS solved,
          COALESCE(grouped.flawless, 0) AS flawless
        FROM days
        LEFT JOIN grouped ON grouped.day = days.day
        ORDER BY days.day
      `,
      [userId],
    );
  }
  return pool.query(
    `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - INTERVAL '6 days',
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        )::date AS day
      ),
      per_task_day AS (
        SELECT
          date_trunc('day', created_at)::date AS day,
          task_id,
          MAX(score) AS max_score
        FROM attempts
        WHERE user_id = $1
          AND created_at >= date_trunc('day', NOW()) - INTERVAL '6 days'
        GROUP BY 1, 2
      ),
      grouped AS (
        SELECT
          day,
          COUNT(*) FILTER (WHERE max_score < 50)::int AS unfinished,
          COUNT(*) FILTER (WHERE max_score >= 50 AND max_score < 95)::int AS in_progress,
          COUNT(*) FILTER (WHERE max_score >= 95 AND max_score < 100)::int AS solved,
          COUNT(*) FILTER (WHERE max_score = 100)::int AS flawless
        FROM per_task_day
        GROUP BY day
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS day,
        COALESCE(grouped.unfinished, 0) AS unfinished,
        COALESCE(grouped.in_progress, 0) AS in_progress,
        COALESCE(grouped.solved, 0) AS solved,
        COALESCE(grouped.flawless, 0) AS flawless
      FROM days
      LEFT JOIN grouped ON grouped.day = days.day
      ORDER BY days.day
    `,
    [userId],
  );
}
