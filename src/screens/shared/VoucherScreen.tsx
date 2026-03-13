import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, formatCLP } from '../../lib/store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function VoucherScreen({ route, navigation }: any) {
    const { dueId } = route.params;
    const memberDues = useAppStore(s => s.memberDues);
    const due = memberDues.find(d => d.id === dueId);

    if (!due) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}><Text>Documento no encontrado</Text></View>
            </SafeAreaView>
        );
    }

    const generateAndSharePDF = async () => {
        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { 
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                            padding: 20px; 
                            color: #191C1E; 
                            background-color: #F7F9FB;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 20px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        }
                        .header { text-align: center; margin-bottom: 30px; }
                        .logo { font-size: 50px; margin-bottom: 10px; }
                        .org-name { font-weight: 800; font-size: 18px; color: #002545; letter-spacing: 1px; }
                        .org-sub { font-size: 14px; color: #43474E; }
                        .recibo-title { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: flex-start;
                            margin-top: 30px;
                            border-bottom: 2px solid #F0F5FA;
                            padding-bottom: 20px;
                        }
                        .title-text { font-size: 24px; font-weight: bold; color: #002545; }
                        .doc-number { text-align: right; }
                        .label { font-size: 10px; font-weight: bold; color: #73777F; text-transform: uppercase; margin-bottom: 4px; }
                        .value { font-size: 16px; font-weight: 700; color: #191C1E; }
                        .grid { display: flex; gap: 20px; margin: 25px 0; }
                        .box { flex: 1; background: #F8FAFC; padding: 15px; border-radius: 12px; }
                        .box-large { background: #F8FAFC; padding: 15px; border-radius: 12px; margin-bottom: 15px; }
                        .amount { color: #002545; font-size: 20px; }
                        .stamp { 
                            text-align: center; 
                            margin-top: 40px; 
                            padding: 25px; 
                            border: 2px dashed #E0E3E5; 
                            border-radius: 16px; 
                        }
                        .stamp-icon { font-size: 32px; }
                        .stamp-text { font-size: 10px; font-weight: bold; color: #73777F; margin-top: 5px; }
                        .footer { 
                            text-align: center; 
                            font-size: 10px; 
                            font-weight: bold; 
                            color: #43474E80; 
                            font-style: italic; 
                            margin-top: 20px; 
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">🏛️</div>
                            <div class="org-name">JUNTA DE VECINOS</div>
                            <div class="org-sub">UNIDAD VECINAL 22</div>
                        </div>
                        
                        <div class="recibo-title">
                            <div>
                                <div class="label">Comprobante Oficial</div>
                                <div class="title-text">Recibo de Pago</div>
                            </div>
                            <div class="doc-number">
                                <div class="label">N° Documento</div>
                                <div class="value">${due.voucherId || 'S/N'}</div>
                            </div>
                        </div>

                        <div class="grid">
                            <div class="box">
                                <div class="label">Fecha de pago</div>
                                <div class="value">${due.paidDate}</div>
                            </div>
                            <div class="box">
                                <div class="label">Monto Pagado</div>
                                <div class="value amount">${formatCLP(due.amount)}</div>
                            </div>
                        </div>

                        <div class="box-large">
                            <div class="label">Socio / Beneficiario</div>
                            <div class="value">${due.memberName}</div>
                        </div>

                        <div class="box-large">
                            <div class="label">Concepto</div>
                            <div class="value">Cuota Mensual - ${MONTHS[due.month - 1]} ${due.year}</div>
                        </div>

                        <div class="stamp">
                            <div class="stamp-icon">🛡️</div>
                            <div class="stamp-text">VALIDADO DIGITAL</div>
                        </div>
                        
                        <div class="footer">SISTEMA CIVIC FLOW</div>
                    </div>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (uri) {
                await Sharing.shareAsync(uri, { 
                    UTI: '.pdf', 
                    mimeType: 'application/pdf',
                    dialogTitle: 'Comprobante de Pago JJVV'
                });
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'No se pudo generar el PDF. Asegúrate de tener instalada la dependencia expo-print.');
        }
    };

    const handleShareText = async () => {
        try {
            await Share.share({
                message: `Comprobante de Pago Oficial - JJVV\nDocumento: ${due.voucherId}\nSocio: ${due.memberName}\nCuota: ${MONTHS[due.month - 1]} ${due.year}\nMonto: ${formatCLP(due.amount)}\nFecha de Pago: ${due.paidDate}`,
                title: 'Comprobante de Pago',
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>

                {/* Voucher Container */}
                <View style={s.voucherContainer}>
                    {/* Branding */}
                    <View style={s.branding}>
                        <View style={s.logoContainer}>
                            <Text style={s.logoIcon}>🏛️</Text>
                        </View>
                        <Text style={s.orgName}>JUNTA DE VECINOS</Text>
                        <Text style={s.orgSubName}>UNIDAD VECINAL 22</Text>
                    </View>

                    {/* The "Paper" */}
                    <View style={s.paper}>
                        <View style={s.topDecoration} />
                        
                        <View style={s.headerContainer}>
                            <View>
                                <Text style={s.headerLabel}>COMPROBANTE OFICIAL</Text>
                                <Text style={s.headerTitle}>Recibo de Pago</Text>
                            </View>
                            <View>
                                <Text style={s.docLabel}>N° Documento</Text>
                                <Text style={s.docNumber}>{due.voucherId || 'S/N'}</Text>
                            </View>
                        </View>

                        {/* Details Grid */}
                        <View style={s.detailsGrid}>
                            <View style={s.detailBox}>
                                <Text style={s.detailLabel}>Fecha de pago</Text>
                                <Text style={s.detailValue}>{due.paidDate}</Text>
                            </View>
                            <View style={s.detailBox}>
                                <Text style={s.detailLabel}>Monto Pagado</Text>
                                <Text style={[s.detailValue, s.amountColor]}>{formatCLP(due.amount)}</Text>
                            </View>
                        </View>

                        <View style={s.detailBoxLarge}>
                            <Text style={s.detailLabel}>Socio / Beneficiario</Text>
                            <Text style={s.detailValueText}>{due.memberName}</Text>
                        </View>

                        <View style={s.detailBoxLarge}>
                            <Text style={s.detailLabel}>Concepto</Text>
                            <Text style={s.detailValueText}>Cuota Mensual - {MONTHS[due.month - 1]} {due.year}</Text>
                        </View>

                        {/* Stamp Area */}
                        <View style={s.stampArea}>
                            <View style={s.stampCircle}>
                                <Text style={s.stampIcon}>🛡️</Text>
                                <Text style={s.stampText}>VALIDADO{'\n'}DIGITAL</Text>
                            </View>
                            <Text style={s.stampFooter}>SISTEMA CIVIC FLOW</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={s.actions}>
                        <TouchableOpacity style={s.primaryBtn} onPress={generateAndSharePDF}>
                            <Text style={s.primaryBtnIcon}>📥</Text>
                            <Text style={s.primaryBtnText}>Descargar PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.secondaryBtn} onPress={generateAndSharePDF}>
                            <Text style={s.secondaryBtnIcon}>📤</Text>
                            <Text style={s.secondaryBtnText}>Compartir</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={s.reportBtn}>
                        <Text style={s.reportText}>⚠️ ¿Hay un error en este recibo?</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F9FB' },
    scroll: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backBtn: { marginBottom: 20 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    voucherContainer: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    branding: { alignItems: 'center', marginBottom: 24 },
    logoContainer: { width: 48, height: 48, backgroundColor: '#002545', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    logoIcon: { fontSize: 24 },
    orgName: { fontSize: 14, fontWeight: '800', color: '#002545', letterSpacing: 1 },
    orgSubName: { fontSize: 12, color: '#43474E', fontWeight: '500' },
    paper: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, elevation: 4, position: 'relative', overflow: 'hidden' },
    topDecoration: { position: 'absolute', top: 0, right: 0, width: 120, height: 120, backgroundColor: '#F0F5FA', borderBottomLeftRadius: 100 },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    headerLabel: { fontSize: 10, fontWeight: 'bold', color: '#1A3B5D99', marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#002545' },
    docLabel: { fontSize: 10, color: '#43474E', textAlign: 'right', marginBottom: 2 },
    docNumber: { fontSize: 14, fontWeight: 'bold', color: '#002545', textAlign: 'right' },
    detailsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    detailBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
    detailBoxLarge: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12 },
    detailLabel: { fontSize: 10, fontWeight: '600', color: '#43474E', marginBottom: 4 },
    detailValue: { fontSize: 14, fontWeight: 'bold', color: '#191C1E' },
    detailValueText: { fontSize: 15, fontWeight: '600', color: '#191C1E' },
    amountColor: { color: '#002545' },
    stampArea: { alignItems: 'center', paddingVertical: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E0E3E5', borderRadius: 16, marginTop: 12 },
    stampCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F4F6', justifyContent: 'center', alignItems: 'center', padding: 8 },
    stampIcon: { fontSize: 24, marginBottom: 2 },
    stampText: { fontSize: 8, fontWeight: 'bold', color: '#73777F', textAlign: 'center' },
    stampFooter: { fontSize: 10, color: '#43474E80', fontWeight: 'bold', marginTop: 12, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    primaryBtn: { flex: 1, backgroundColor: '#002545', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    primaryBtnIcon: { fontSize: 18 },
    primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
    secondaryBtn: { flex: 1, backgroundColor: '#D0E1FB', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    secondaryBtnIcon: { fontSize: 18 },
    secondaryBtnText: { color: '#38485D', fontWeight: 'bold' },
    reportBtn: { marginTop: 16, padding: 8, alignSelf: 'center' },
    reportText: { fontSize: 12, color: '#43474E', fontWeight: '500' },
});
