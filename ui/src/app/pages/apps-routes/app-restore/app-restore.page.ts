import { Component, ViewChild } from '@angular/core'
import { IonContent, LoadingController, ModalController } from '@ionic/angular'
import { ApiService } from 'src/app/services/api/embassy/embassy-api.service'
import { BackupConfirmationComponent } from 'src/app/modals/backup-confirmation/backup-confirmation.component'
import { DiskInfo } from 'src/app/services/api/api.types'
import { ActivatedRoute } from '@angular/router'
import { PatchDbService } from 'src/app/services/patch-db/patch-db.service'
import { Subscription } from 'rxjs'
import { take } from 'rxjs/operators'

@Component({
  selector: 'app-restore',
  templateUrl: './app-restore.page.html',
  styleUrls: ['./app-restore.page.scss'],
})
export class AppRestorePage {
  disks: DiskInfo
  pkgId: string
  title: string
  loading = true
  error: string
  allPartitionsMounted: boolean

  @ViewChild(IonContent) content: IonContent
  subs: Subscription[] = []

  constructor (
    private readonly route: ActivatedRoute,
    private readonly modalCtrl: ModalController,
    private readonly embassyApi: ApiService,
    private readonly loadingCtrl: LoadingController,
    public readonly patch: PatchDbService,
  ) { }

  ngOnInit () {
    this.pkgId = this.route.snapshot.paramMap.get('pkgId')
    this.getExternalDisks()
  }

  ngAfterViewInit () {
    this.content.scrollToPoint(undefined, 1)
  }

  async refresh () {
    this.loading = true
    await this.getExternalDisks()
  }

  async getExternalDisks (): Promise<void> {
    try {
      this.disks = await this.embassyApi.getDisks({ })
      this.allPartitionsMounted = Object.values(this.disks).every(d => Object.values(d.partitions).every(p => p['is-mounted']))
    } catch (e) {
      console.error(e)
      this.error = e.message
    } finally {
      this.loading = false
    }
  }

  async presentModal (logicalname: string): Promise<void> {
    const m = await this.modalCtrl.create({
      componentProps: {
        type: 'restore',
      },
      cssClass: 'alertlike-modal',
      component: BackupConfirmationComponent,
      backdropDismiss: false,
    })

    m.onWillDismiss().then(res => {
      const data = res.data
      if (data.cancel) return
      this.restore(logicalname, data.password)
    })

    return await m.present()
  }

  private async restore (logicalname: string, password: string): Promise<void> {
    this.error = ''

    const loader = await this.loadingCtrl.create({
      spinner: 'lines',
    })
    await loader.present()

    try {
      await this.embassyApi.restorePackage({
        id: this.pkgId,
        logicalname,
        password,
      })
    } catch (e) {
      console.error(e)
      this.error = e.message
    } finally {
      loader.dismiss()
    }
  }
}
