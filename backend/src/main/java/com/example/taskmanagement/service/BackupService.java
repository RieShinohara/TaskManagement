package com.example.taskmanagement.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.taskmanagement.dto.BackupCard;
import com.example.taskmanagement.dto.BackupColumn;
import com.example.taskmanagement.dto.BackupFile;
import com.example.taskmanagement.dto.BackupSettings;
import com.example.taskmanagement.entity.BoardColumn;
import com.example.taskmanagement.entity.BoardSetting;
import com.example.taskmanagement.entity.Card;
import com.example.taskmanagement.exception.InvalidRequestException;
import com.example.taskmanagement.repository.BoardColumnRepository;
import com.example.taskmanagement.repository.CardRepository;

// バックアップ（全データの書き出しと、読み込み）の処理を行う層
@Service
public class BackupService {

	// 読み込みの本文（バックアップファイル）の大きさの上限（20MB）。画面も、同じ値で、送る前に断る
	public static final int MAX_BYTES = 20 * 1024 * 1024;

	// 読み込めるカードの数の上限（500枚が目安なので、十分に大きい値）
	private static final int MAX_CARDS = 10000;

	private final BoardColumnRepository columnRepository;
	private final CardRepository cardRepository;
	private final SettingService settingService;

	public BackupService(BoardColumnRepository columnRepository, CardRepository cardRepository,
			SettingService settingService) {
		this.columnRepository = columnRepository;
		this.cardRepository = cardRepository;
		this.settingService = settingService;
	}

	// 全部の列とカードを、入れ子の形にして返す。並び順は、配列の順（列は左から、カードは上から）
	// （設定がまだなければ、設定を作る処理が入るので、読み取り専用にはしない）
	@Transactional
	public BackupFile export() {
		List<BackupColumn> columns = columnRepository.findAllByOrderBySortOrderAsc().stream()
				.map(column -> new BackupColumn(column.getName(),
						cardRepository.findByColumnIdOrderByPositionAscIdAsc(column.getId()).stream()
								.map(card -> new BackupCard(card.getTitle(), card.getDescription(), card.getColor(),
										card.getDueDate()))
								.toList()))
				.toList();
		BackupSettings settings = new BackupSettings(settingService.find().background());
		return new BackupFile(BackupFile.APP_NAME, BackupFile.VERSION, Instant.now(), settings, columns);
	}

	// 今あるカードと列を全部消して、ファイルの内容に入れ替える。
	// 1つのトランザクション：途中で失敗したら、全部取り消され、今のデータは変わらない。
	// IDは振り直され、列の sortOrder は 1,2,3…、カードの position は 0,1,2… の連番になる
	@Transactional
	public void restore(BackupFile file) {
		int total = file.columns().stream().mapToInt(c -> c.cards().size()).sum();
		if (total > MAX_CARDS) {
			throw new InvalidRequestException("カードが多すぎます（" + MAX_CARDS + "枚まで）");
		}

		cardRepository.deleteAllInBatch(); // カードが列を指しているので、カードから先に消す
		columnRepository.deleteAllInBatch();

		for (int i = 0; i < file.columns().size(); i++) {
			BackupColumn backupColumn = file.columns().get(i);
			BoardColumn column = columnRepository.save(new BoardColumn(backupColumn.name().strip(), i + 1));
			List<Card> cards = new ArrayList<>();
			for (int j = 0; j < backupColumn.cards().size(); j++) {
				BackupCard backupCard = backupColumn.cards().get(j);
				Card card = new Card(backupCard.title().strip(), backupCard.color(), backupCard.dueDate(), column, j);
				// 空白だけの説明文は、「なし」にする（更新と同じ）
				String description = (backupCard.description() == null || backupCard.description().isBlank()) ? null
						: backupCard.description();
				card.update(card.getTitle(), description, card.getColor(), card.getDueDate());
				cards.add(card);
			}
			cardRepository.saveAll(cards);
		}

		// 背景の設定。ファイルになければ（古いバックアップ）、初期値の青空にする。自分の画像には、触らない
		String background = (file.settings() == null) ? BoardSetting.DEFAULT_BACKGROUND
				: file.settings().background();
		settingService.update(background);
	}

}
