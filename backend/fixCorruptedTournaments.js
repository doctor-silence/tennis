// backend/fixCorruptedTournaments.js
const pool = require('./db');

const fixTournaments = async () => {
    console.log('Запускаю проверку турниров...');
    const client = await pool.connect();
    try {
        // Выбираем raw-значение поля 'rounds' в текстовом формате для ручной проверки
        const { rows } = await client.query("SELECT id, rounds::text FROM tournaments");
        let corruptedCount = 0;

        for (const row of rows) {
            try {
                // Пытаемся распарсить текстовое представление поля 'rounds'
                const rounds = JSON.parse(row.rounds);
                // Дополнительная проверка: убедимся, что это массив, как ожидает фронтенд
                if (!Array.isArray(rounds)) {
                    throw new Error('Поле Rounds не является массивом.');
                }
            } catch (e) {
                corruptedCount++;
                console.log(`- Найдена поврежденная запись в 'rounds' для турнира с ID: ${row.id}.`);
                console.log(`  Ошибка: ${e.message}`);
                
                try {
                    // Сбрасываем поле 'rounds' на пустой массив '[]'
                    await client.query(
                        "UPDATE tournaments SET rounds = '[]'::jsonb WHERE id = $1",
                        [row.id]
                    );
                    console.log(`  ✅ Поле 'rounds' для турнира с ID: ${row.id} было успешно сброшено.`);
                } catch (updateError) {
                    console.error(`  ❌ Не удалось обновить турнир с ID: ${row.id}. Ошибка: ${updateError.message}`);
                }
            }
        }

        if (corruptedCount === 0) {
            console.log('\n✅ Все записи турниров в порядке. Повреждений не найдено.');
        } else {
            console.log(`\nНайдено и предпринята попытка исправить ${corruptedCount} поврежденных турнира(ов).`);
        }

    } catch (err) {
        console.error('❌ Ошибка во время проверки турниров:', err);
    } finally {
        console.log('Завершение работы...');
        client.release();
        // Закрываем пул соединений, чтобы скрипт мог завершиться
        await pool.end();
        console.log('Пул соединений с базой данных закрыт.');
    }
};

fixTournaments();
