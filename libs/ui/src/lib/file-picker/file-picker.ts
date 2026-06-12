import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  type OnChanges,
  Output,
  signal,
  type SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'lib-file-picker',
  standalone: true,
  templateUrl: './file-picker.html',
  styleUrl: './file-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilePicker implements OnChanges {
  @Input() label = '';
  @Input() maxSizeMb = 5;
  @Input() accept = 'image/jpeg,image/png,image/webp';
  /** URL of an already-stored image to display as initial preview */
  @Input() existingUrl: string | null = null;

  @Output() fileChange = new EventEmitter<File | null>();

  readonly preview = signal<string | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly sizeLabel = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  private selectedFile: File | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingUrl'] && !this.preview()) {
      // keep local preview if user already picked a file
    }
  }

  get displayUrl(): string | null {
    return this.preview() ?? this.existingUrl;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) return;

    const maxBytes = this.maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      this.error.set(`Файл занадто великий. Максимум ${this.maxSizeMb} МБ`);
      input.value = '';
      return;
    }

    this.error.set(null);
    this.fileName.set(file.name);
    this.sizeLabel.set(this.formatBytes(file.size));
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => this.preview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.fileChange.emit(file);
    // reset so same file can be re-selected
    input.value = '';
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.preview.set(null);
    this.fileName.set(null);
    this.sizeLabel.set(null);
    this.error.set(null);
    this.fileChange.emit(null);
  }

  getFile(): File | null {
    return this.selectedFile;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
}
