package com.example.taskmanagement.controller;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.example.taskmanagement.exception.PayloadTooLargeException;
import com.example.taskmanagement.service.BackupService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

// バックアップの読み込み（POST /api/backup/restore）の本文の大きさに、上限（20MB）を設ける。
// 上限がないと、巨大な本文で、サーバーのメモリを使い切られるおそれがある。
// 本文を JSON として読む部品（@RequestBody）は、本文を全部読み込んでから調べるので、その手前（Filter）で見張る。
// 画面も、同じ値で、送る前に断る（F5）が、画面を通らない送り方もできるので、サーバーも、断る
@Component
public class BackupBodyLimitFilter extends OncePerRequestFilter {

	private static final long MAX = BackupService.MAX_BYTES;

	private final HandlerExceptionResolver exceptionResolver;

	// Filter の中の例外は、ふつうの窓口（Controller）の外なので、ApiExceptionHandler が働かない。
	// Spring が持つ「例外を返事に変える部品」を渡してもらい、ApiExceptionHandler と同じ形（413 の ProblemDetail）で返す
	public BackupBodyLimitFilter(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
		this.exceptionResolver = exceptionResolver;
	}

	// 見張るのは、復元の窓口だけ
	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !("POST".equals(request.getMethod()) && "/api/backup/restore".equals(request.getRequestURI()));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		// 1. 送られてくる大きさの申告（Content-Length）が上限を超えていれば、本文を読まずに断る
		if (request.getContentLengthLong() > MAX) {
			exceptionResolver.resolveException(request, response, null, tooLarge());
			return;
		}
		// 2. 大きさを申告しない送り方（分割送信）や、申告が嘘のときのために、上限を超えて読もうとしたら、止める
		chain.doFilter(new LimitedRequest(request), response);
	}

	private static PayloadTooLargeException tooLarge() {
		return new PayloadTooLargeException("ファイルが大きすぎます（20MBまで）");
	}

	// 本文を読むときに、読んだ量を数え、上限を超えたら、PayloadTooLargeException を投げるリクエスト
	private static final class LimitedRequest extends HttpServletRequestWrapper {

		LimitedRequest(HttpServletRequest request) {
			super(request);
		}

		@Override
		public ServletInputStream getInputStream() throws IOException {
			return new LimitedInputStream(super.getInputStream());
		}
	}

	private static final class LimitedInputStream extends ServletInputStream {

		private final ServletInputStream delegate;
		private long count;

		LimitedInputStream(ServletInputStream delegate) {
			this.delegate = delegate;
		}

		@Override
		public int read() throws IOException {
			int value = delegate.read();
			if (value != -1) {
				add(1);
			}
			return value;
		}

		// 上限より1バイト多くまでしか、読み進めない（それ以上は、元の本文から読まない）
		@Override
		public int read(byte[] buffer, int offset, int length) throws IOException {
			int allowed = (int) Math.min(length, MAX + 1 - count);
			int read = delegate.read(buffer, offset, allowed);
			if (read > 0) {
				add(read);
			}
			return read;
		}

		private void add(int bytes) {
			count += bytes;
			if (count > MAX) {
				throw tooLarge();
			}
		}

		@Override
		public boolean isFinished() {
			return delegate.isFinished();
		}

		@Override
		public boolean isReady() {
			return delegate.isReady();
		}

		@Override
		public void setReadListener(ReadListener readListener) {
			delegate.setReadListener(readListener);
		}
	}

}
